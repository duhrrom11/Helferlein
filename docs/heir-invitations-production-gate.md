# Erbeneinladungen – Produktionsfreigabe (NO-GO bis Abnahme)

Stand: 2026-11-12. Diese Datei dokumentiert nur die Vorbereitung; keine Migration, kein Test und kein Deployment wurde durch diese Dokumentation ausgelöst.

## Reihenfolge und Abhängigkeiten

1. Produktives Schema read-only abgleichen: `public.vault_cloud_snapshots(owner_user_id)` als UUID-Primärschlüssel, `auth.users(id)`, existierende Objekte im Schema `nachlass_private`, bestehende gleichnamige RPCs und Migrationshistorie. Die erste Migration verwendet bewusst `CREATE SCHEMA` und bricht bei Konflikt ab.
2. Separat genehmigt: `supabase/migrations/20261112070000_heir_invitations_private_schema.sql`.
3. Separat genehmigt: `supabase/migrations/20261112070001_heir_invitations_issue_revoke.sql`.
4. Effektive Rechte und Funktionseigentümer nach der Migration prüfen: `SECURITY DEFINER`-RPCs nur für `service_role` ausführbar, keine Rechte für `PUBLIC`, `anon`, `authenticated`; RLS beider privaten Tabellen aktiv, private Schemazugriffe ausgeschlossen. Funktionen dürfen nur von einem vertrauenswürdigen privilegierten Migrationsinhaber erstellt werden.
5. Edge Functions mit `verify_jwt = true` bereitstellen, aber serverseitige Opt-ins nicht aktivieren. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ausschließlich im vorgesehenen Serverkontext konfigurieren; niemals Schlüssel in GitHub ablegen.
6. Separat genehmigte technische Abnahme: JWT-Prüfung, abgelaufene/fremde/widerrufene Token, parallele Ausstellung/Einlösung/Widerruf, fehlende Berechtigungen, Datenbankfehler und sichere Fehlermeldungen.
7. Erst nach Abnahme separat freigeben: `HEIR_INVITATIONS_ENABLED=true` und `HEIR_REDEMPTION_ENABLED=true`. Frontend `BACKEND_APPROVED=false` bis zum letzten gesonderten Freigabeschritt beibehalten.

## Sperr- und Widerrufskonzept

Die RPCs verwenden die Reihenfolge Eigentümerzeile (`FOR UPDATE`) vor Einladungszeile (`FOR UPDATE`). Die Einlösung liest die Eigentümer-ID zunächst ohne Sperre und validiert nach beiden Sperren den vollständigen Einladungszustand erneut. Der Widerruf markiert auch bereits angenommene Zuordnungen als widerrufen. Eine bereits widerrufene Zuordnung blockiert bewusst eine neue Einladung für dasselbe Paar. Kein Erbenzugriff auf Tresordaten wird eingerichtet.

## Verbleibende Risiken und Stoppschalter

- **NO-GO**, solange produktive Rollenrechte, Funktionsinhaberschaft und bestehende Objekte nicht geprüft sind.
- **NO-GO**, solange Parallelitäts- und Fehlerfälle nicht kontrolliert abgenommen wurden. Eine einheitliche Sperrreihenfolge allein garantiert keine Deadlock-Freiheit mit fremden Tabellenoperationen oder FK-Triggern.
- **NO-GO**, solange Rate-Limiting, Missbrauchserkennung, sichere Protokollierung ohne Token, Alarmierung und Wiederherstellungsplan nicht freigegeben sind.
- Bei Problemen: beide serverseitigen Opt-ins deaktiviert lassen bzw. zurücksetzen; Frontend gesperrt lassen. Datenbankmigrationen nicht unüberlegt rückgängig machen, da Löschungen angenommene Einladungen und Zuordnungen verlieren könnten. Vor jeder Rückmigration Sicherung, Abhängigkeiten und Datenfolgen prüfen.
- Keine produktiven Testdatensätze. Eine spätere technische Abnahme benötigt eine gesonderte Freigabe und ein geeignetes isoliertes Verfahren.

## Freigabestatus

**NO-GO** bis die obigen Nachweise vorliegen und eine ausdrückliche produktive Freigabe erteilt wurde.

## Autorisierungsgrenze – verbindlicher Vertrauensvertrag

- Der HTTP-Aufrufer darf ausschließlich ein Supabase-Bearer-Token und die erlaubten Aktionsdaten liefern. Weder Eigentümer-ID noch eingelöste Benutzer-ID werden aus JSON oder URL übernommen. `heir-invitations` bestimmt `ownerId` ausschließlich durch `auth.getUser(bearer)`; `heir-redemption` bestimmt die Benutzer-ID über denselben Auth-Dienst im gemeinsamen Helper.
- Der Service-Role-Schlüssel ist ausschließlich in der Edge-Function-Laufzeit zulässig. Die SQL-RPCs akzeptieren privilegierte Identitätsparameter **nur aufgrund dieser serverseitigen Vertrauensgrenze**. Sie sind nicht als direkte Client-APIs freizugeben. Das JWT-Gateway (`verify_jwt=true`) und `auth.getUser` müssen beide aktiv bleiben.
- `Origin` und CORS sind keine Authentifizierung. Aufrufe ohne Origin sind möglich; allein ein geprüftes JWT darf die Identität festlegen. Kein Client darf den Service-Role-Schlüssel oder den Opt-in-Schalter kontrollieren.
- Privilegierte RPC-Ausführung darf weder an `PUBLIC`, `anon` noch `authenticated` vererbt werden. Zusätzlich müssen tatsächliche Eigentümer und `EXECUTE`-ACLs nach dem Ausrollen geprüft werden. Keine neuen RPC-Aufrufpfade ohne erneute Sicherheitsprüfung.
- Ein registrierter Empfänger wird durch seine UUID identifiziert; die bloße Kenntnis einer UUID berechtigt nicht zur Einlösung. Der Empfänger muss zusätzlich das geheime Token und ein gültiges JWT des passenden Kontos besitzen.

## Fehlerklassifikation und Beobachtbarkeit

- `heir-invitations`: erwartete fachliche Ablehnung der Ausstellung = HTTP 409, nicht vorhandene bzw. fremde Einladung beim Widerruf = HTTP 404. Explizite RPC-Transport- oder Datenbankfehler = HTTP 503. Die HTTP-Antwort enthält weder SQL-Details noch Token.
- `heir-redemption`: ungültige, fremde, abgelaufene oder bereits verwendete Einladungen erhalten dieselbe generische Ablehnung. Explizite RPC-Fehler, unerwartete RPC-Ergebnisse und interne Hashingfehler liefern nun HTTP 503 mit neutralem Fehlercode; fachliche Ablehnungen bleiben HTTP 404. Vor Produktivfreigabe sind die Pfade technisch abzunehmen.
- Keine vollständigen Request-Bodys, Einladungs-Token, Token-Hashes, Bearer-Token oder Service-Role-Schlüssel protokollieren. Zulässige Betriebsmetriken: aggregierte HTTP-Statusklassen, technische Fehlerkategorien, begrenzte Anzahl fehlgeschlagener Versuche ohne personenbezogene Rohdaten.
- Rate-Limits und Missbrauchsschutz für Ausstellungs- und Einlösungsversuche sind vor Aktivierung zu spezifizieren. Die CORS-Origin-Liste ist kein Ersatz dafür.

## Datenbankabhängigkeiten und Migrationsvorbedingungen

- Migration 1 erfordert `gen_random_uuid()`, `auth.users(id)` sowie `public.vault_cloud_snapshots(owner_user_id)` mit kompatiblem UUID-Typ und geeigneter Eindeutigkeit für den Fremdschlüssel.
- Die neuen Tabellen referenzieren den Eigentümer mit `ON DELETE CASCADE`. Deshalb vor der Freigabe bestehende Löschpfade und deren Sperrreihenfolge prüfen.
- Migration 1 erstellt `nachlass_private` neu; vorhandene gleichnamige Objekte führen absichtlich zum Abbruch. Migration 2 setzt die Tabellen und die erste RPC voraus. Beide Migrationen benötigen einen vertrauenswürdigen, ausreichend privilegierten Ausführungsinhaber.
- `CREATE FUNCTION` statt `CREATE OR REPLACE FUNCTION` schützt gegen stilles Überschreiben, verhindert aber keine Konflikte mit anders signierten Überladungen. Vor der Freigabe gleichnamige Funktionen und exponierte Schemas auflisten.
- Die Prüfung der tatsächlichen Rechte, RLS-Policies, Funktionsinhaber, bestehenden Trigger und Sperrketten ist eine **noch offene** Voraussetzung. Die statische Dateiprüfung bestätigt diese Eigenschaften nicht.

## Missbrauchsschutz – statische Grenzen und noch fehlende Infrastruktur

- Bereits umgesetzt: JWT-Gateway und serverseitige `auth.getUser`-Prüfung, strikt begrenzte JSON-Eingaben, Body-Größenlimits (Ausstellung 1024 Byte, Einlösung 512 Byte), Tokenformatprüfung, CORS-Whitelist, neutrale Fehlermeldungen, kein Token-Logging und serverseitige Opt-in-Schalter.
- Ein `404` bei fachlicher Einlöseablehnung verrät nicht, ob Token unbekannt, abgelaufen, fremd oder widerrufen ist. Technische Ausfälle sind als `503` erkennbar; diese Unterscheidung darf keine personenbezogenen Details enthalten.
- **Im Sicherheitsbranch vorbereitet, nicht ausgerollt:** verteiltes Rate-Limiting pro verifiziertem Benutzer und Operation über eine atomare PostgreSQL-RPC. Schutz gegen anonyme Angriffe, verteilte Konten und großflächige Missbrauchsmuster bleibt separat erforderlich.
- Vor Aktivierung muss ein zentraler, atomarer Limitierungsmechanismus mit sicheren Ausfallregeln, Quoten, Zeitfenstern und Datenschutzkonzept ausdrücklich freigegeben werden. Bis dahin beide Opt-in-Schalter deaktiviert lassen.
- Keine Geheimnisse, Token, Hashes, JWTs oder vollständige Request-Bodys in Telemetrie. Statusklassen und technische Fehlerkategorien können aggregiert werden, nachdem die Betriebsüberwachung gesondert genehmigt wurde.

## Vorbereitete verteilte Limitierung (nicht aktiv)

- Dritte, **noch nicht ausgeführte** Migration: `20261112070002_heir_rate_limits.sql`. Muss nach beiden bestehenden Migrationen und vor jeder Edge-Function-Aktivierung angewendet werden.
- Atomarer PostgreSQL-Upsert auf `(actor_id, operation, window_seconds, window_start)` vermeidet isolat-lokale Zähler und serialisiert konkurrierende Verbrauchsversuche über einen eindeutigen Schlüssel. Zwei feste Zeitfenster: 60 Sekunden und 1 Stunde, nach Datenbankuhr.
- Startquoten (vor Freigabe fachlich prüfen): `issue` 2/Minute und 5/Stunde/Benutzer, `redeem` 3/Minute und 10/Stunde/Benutzer. Widerrufe sind absichtlich nicht quotiert. Erfolgreiche und erfolglose autorisierte Versuche verbrauchen Kontingent. Überschreitung = generisches HTTP 429, Datenbank-/Transportfehler = HTTP 503 (fail closed).
- Die Limitierungs-RPC ist nur `service_role` zugänglich. Identität stammt aus `auth.getUser`, niemals aus einem Clientfeld. Es werden ausschließlich Benutzer-UUID, Operationsklasse, Zeitfenster und Zähler gespeichert; keine IP-Adresse, Tokens, Hashes oder Request-Inhalte.
- **NO-GO:** Ohne ausgeführte und geprüfte dritte Migration würde die neue Edge-Function-Version bei Limitierungs-RPC-Fehlern mit 503 abbrechen. Die bestehende Aktivierung muss deshalb weiter ausgeschaltet bleiben.
- **NO-GO:** Schutz gegen nicht authentifizierte Last, Botnetze und Konto-Rotation ist damit nicht abgedeckt. Vor Freigabe zusätzliche Gateway-/WAF-Quoten, Alarmierung, Abuse-Prozesse und datenschutzgerechte Aufbewahrung definieren.
- **NO-GO bis Betriebsabnahme:** Eine begrenzte Wartungsfunktion `nachlass_private.prune_heir_rate_limits` ist vorbereitet (maximal 1000 Einträge pro Aufruf, nur älter als 48 Stunden, `SKIP LOCKED`). Sie ist nicht für `service_role` freigegeben und wird nicht automatisch ausgeführt. Wartungsrolle, Intervall und Aufbewahrung separat genehmigen.
- Der Aufruf der Limitierungs-RPC erfolgt vor Ausstellung oder Einlösung, aber nicht vor dem sicherheitskritischen Widerruf. Bei einem späteren Fehler wird der verbrauchte Zähler nicht rückgängig gemacht; das ist für einen Missbrauchsschutz beabsichtigt.
- Ein Limit kann legitime Benutzer temporär blockieren. Quoten, Wiederholungsverhalten, Zugänglichkeit und Nutzerkommunikation vor Aktivierung gesondert abnehmen.

## Ergänzende Sicherheitsabwägungen

- Ein Widerruf wird nicht durch ein Kontingent blockiert. Er erfordert weiterhin ein geprüftes JWT und die atomare Eigentümerprüfung. Infrastrukturfehler können den Widerruf weiterhin verhindern.
- Beide festen Zeitfenster begrenzen gewöhnliche Spitzen. Direkt an einer Minutengrenze sind weiterhin bis zu vier Ausstellungs- bzw. sechs Einlöseversuche in kurzer Folge möglich. Ein gleitendes Fenster oder Gateway-Schutz bleibt zu bewerten.
- Die zwei Zähler werden in derselben PostgreSQL-Funktion nacheinander aktualisiert. Bei einer Überschreitung im Stundenfenster kann der Minutenzähler bereits erhöht sein; dies ist konservativ. Ein SQL-Fehler rollt die gesamte RPC-Transaktion zurück.
- Die Wartungsfunktion ist ausschließlich für einen vertrauenswürdigen privilegierten Inhaber vorgesehen. Keine Freigabe an die Edge-Service-Role; kein Bereinigungsjob eingerichtet.
- Keine Compilerprüfung durchgeführt. Die RPC-Adapter verwenden jetzt `PromiseLike` für Supabase-PostgREST-Builder; die tatsächliche Typkompatibilität muss vor Freigabe weiterhin durch eine separat genehmigte Compilerprüfung nachgewiesen werden.

## Statische Nachbesserung: RPC-Vertrag und interne Argumentfehler

- `heir-rate-limit.ts` und `atomic-redemption-store.ts` erwarten für RPC-Aufrufe `PromiseLike` statt ausschließlich `Promise`. Das ermöglicht Promise-ähnliche Supabase-RPC-Builder ohne Typumwandlung; keine Compilerprüfung wurde ausgeführt.
- `consume_heir_rate_limit_atomic` wirft bei fehlender Benutzer-ID oder ungültiger Operationsklasse SQLSTATE `22023`, statt `false` zurückzugeben. Der serverseitige Adapter klassifiziert den RPC-Fehler als `unavailable` (HTTP 503); `false` bleibt für tatsächlich ausgeschöpfte Kontingente reserviert (HTTP 429).
- SQL-Fehlerdetails dürfen ausschließlich intern verbleiben. Die RPC ist weiterhin nur für `service_role` freizugeben. Produktive Berechtigungen und reale TypeScript-Typen bleiben separate Abnahmevoraussetzungen.

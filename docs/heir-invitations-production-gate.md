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
- `heir-redemption`: ungültige, fremde, abgelaufene oder bereits verwendete Einladungen erhalten dieselbe generische Ablehnung. **Derzeit werden auch RPC-Fehler als Ablehnung behandelt**; das verhindert Datenabfluss, erschwert aber die Erkennung von Ausfällen. Vor Produktivfreigabe ist eine datensparsame serverseitige Fehlerklassifikation mit neutralen Client-Antworten zu implementieren und abzunehmen.
- Keine vollständigen Request-Bodys, Einladungs-Token, Token-Hashes, Bearer-Token oder Service-Role-Schlüssel protokollieren. Zulässige Betriebsmetriken: aggregierte HTTP-Statusklassen, technische Fehlerkategorien, begrenzte Anzahl fehlgeschlagener Versuche ohne personenbezogene Rohdaten.
- Rate-Limits und Missbrauchsschutz für Ausstellungs- und Einlösungsversuche sind vor Aktivierung zu spezifizieren. Die CORS-Origin-Liste ist kein Ersatz dafür.

## Datenbankabhängigkeiten und Migrationsvorbedingungen

- Migration 1 erfordert `gen_random_uuid()`, `auth.users(id)` sowie `public.vault_cloud_snapshots(owner_user_id)` mit kompatiblem UUID-Typ und geeigneter Eindeutigkeit für den Fremdschlüssel.
- Die neuen Tabellen referenzieren den Eigentümer mit `ON DELETE CASCADE`. Deshalb vor der Freigabe bestehende Löschpfade und deren Sperrreihenfolge prüfen.
- Migration 1 erstellt `nachlass_private` neu; vorhandene gleichnamige Objekte führen absichtlich zum Abbruch. Migration 2 setzt die Tabellen und die erste RPC voraus. Beide Migrationen benötigen einen vertrauenswürdigen, ausreichend privilegierten Ausführungsinhaber.
- `CREATE FUNCTION` statt `CREATE OR REPLACE FUNCTION` schützt gegen stilles Überschreiben, verhindert aber keine Konflikte mit anders signierten Überladungen. Vor der Freigabe gleichnamige Funktionen und exponierte Schemas auflisten.
- Die Prüfung der tatsächlichen Rechte, RLS-Policies, Funktionsinhaber, bestehenden Trigger und Sperrketten ist eine **noch offene** Voraussetzung. Die statische Dateiprüfung bestätigt diese Eigenschaften nicht.

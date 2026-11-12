# Erbeneinladungen – G0-Nachweischecklisten (nur Vorbereitung)

**Stand:** 2026-11-12 · **NO-GO** · Gilt für [#270](https://github.com/duhrrom11/Helferlein/issues/270), [#271](https://github.com/duhrrom11/Helferlein/issues/271), [#272](https://github.com/duhrrom11/Helferlein/issues/272), [#274](https://github.com/duhrrom11/Helferlein/issues/274), [#275](https://github.com/duhrrom11/Helferlein/issues/275). Ergänzt [Abnahmevorlage](./heir-invitations-acceptance-evidence-template.md) und [Freigabeplan](./heir-invitations-production-release-plan.md). **Alle Kontrollkästchen sind offen.** Diese Checklisten sind keine Ausführungsanweisung, keine Prüfung und keine Freigabe.

## #270 – Produktionsschema / Migrationshistorie (DBA)

**Quellbezug:** `supabase/migrations/20261112070000_heir_invitations_private_schema.sql` (Schema `nachlass_private`, `heir_invitations`, `heir_assignments`, Einlösungs-RPC); `20261112070001_heir_invitations_issue_revoke.sql` (Ausstellung/Widerruf); `20261112070002_heir_rate_limits.sql` (Limiter/Wartung).

- [ ] Read-only Ist-Inventar `public.vault_cloud_snapshots(owner_user_id)`, `auth.users(id)`, Schlüsseltypen, FK-Ziele, `gen_random_uuid()`, vorhandene Trigger/Constraints und ON-DELETE-Ketten mit Version/Quelle sichern.
- [ ] `nachlass_private` auf **Schema, Tabellen, Funktionen, Überladungen und Policies** untersuchen; leere Tabellenliste nicht als Beweis der Schema-/Funktionsabwesenheit werten.
- [ ] Registrierte Versionen `20261112070000`, `20261112070001`, `20261112070002` mit effektiven Objektdefinitionen vergleichen; fehlende Versionen nicht mit fehlenden manuell erstellten Objekten gleichsetzen.
- [ ] Konflikt bei bereits existierendem `nachlass_private` bewerten: erste Migration nutzt `CREATE SCHEMA` ohne `IF NOT EXISTS`; kein blindes Wiederholen.
- [ ] Soll/Ist-Differenzen, zuständige DBA-Person, Datum, unveränderlichen Code-SHA und unabhängige Freigabe dokumentieren.

**Statisch sichtbar:** FK auf `vault_cloud_snapshots(owner_user_id)` und `auth.users(id)`; `token_hash_hex` ist UNIQUE und 64-stelliges Hexformat; `heir_assignments` hat PK `(owner_user_id,heir_user_id)`. **Offen:** effektive Produktionsobjekte und Kaskaden.

## #271 – SECURITY DEFINER / Rollen / RLS (DBA, Security)

- [ ] Alle vier öffentlichen operativen Signaturen einschließlich Parameter-Typen und gleichnamiger Überladungen inventarisieren: `redeem_heir_invitation_atomic(text,uuid)`, `issue_heir_invitation_atomic(uuid,uuid,text,timestamptz)`, `revoke_heir_invitation_atomic(uuid,uuid)`, `consume_heir_rate_limit_atomic(uuid,text)`.
- [ ] Ist-Owner und effektive `EXECUTE`-ACLs einschließlich `PUBLIC`, `anon`, `authenticated`, `service_role`, Rollenvererbung, Schema-`USAGE` und Default Privileges nachweisen.
- [ ] `SECURITY DEFINER SET search_path = ''` und qualifizierte Objektbezüge gegen tatsächliche Definitionen abgleichen; Vertrauenswürdigkeit der Funktionseigentümer unabhängig bestätigen.
- [ ] RLS-Status/Policies und direkte Tabellenrechte für `heir_invitations`, `heir_assignments`, `heir_rate_limits` prüfen; keine Rechte nur aus Migrationsentwurf ableiten.
- [ ] Wartungs-RPC `nachlass_private.prune_heir_rate_limits(integer)` separat prüfen: im Entwurf `REVOKE` auch für `service_role`; tatsächliche berechtigte Betreiberrolle **noch nicht belegt**.
- [ ] Vor-G1-Ist-Nachweis und nach später separat genehmigtem G1 erneuten Ist-Nachweis **getrennt** protokollieren.

**Statisch sichtbar:** REVOKE/GRANT-Anweisungen im SQL-Entwurf. **Offen:** effektive produktive ACL/Owner/RLS.

## #272 – SQL / Deno / RPC-Verträge (Entwicklung, DBA)

- [ ] Unveränderlichen vollständigen Code-SHA und SQL-Dateiversionen fixieren; Code-Review unabhängig dokumentieren.
- [ ] Nach separater Freigabe reproduzierbare SQL-Parser-/Compilerprüfung für alle drei Migrationen dokumentieren, einschließlich `SECURITY DEFINER`, `search_path`, `EXCEPTION`, `ON CONFLICT` und SQLSTATE `22023`.
- [ ] Nach separater Freigabe Deno-/TypeScript-Typprüfung mit `npm:@supabase/supabase-js@2.57.0` und `PromiseLike<{data:unknown;error:unknown}>`-RPC-Adaptern protokollieren.
- [ ] RPC-Name, Argumenttypen, Rückgabewert und Fehlerabbildung für issue/redeem/revoke/consume tabellarisch gegen Edge-Aufrufe abgleichen; Null/false/SQL-Fehler nicht vermischen.
- [ ] `supabase/config.toml` für beide Endpunkte auf `verify_jwt=true` prüfen; Deno-Imports und Secret-Verwendung in den beiden Edge-Quellen und Shared-Modulen unabhängig reviewen.
- [ ] G0-Compiler-/Parsernachweis von späterer G2-Laufzeit-/Fehlerpfadabnahme trennen; kein „kompiliert“ ohne tatsächliches Protokoll behaupten.

**Statisch sichtbar:** Drei versionierte SQL-Entwürfe, Supabase-JS-Pin 2.57.0, JWT-Konfiguration. **Offen:** Compiler-, Parser- und Laufzeitnachweise.

## #274 – Gateway / Abuse / Monitoring (Security, SRE)

- [ ] Quellseitige Sicherheitsgrenzen dokumentieren: `auth.getUser`, `verify_jwt=true`, `HEIR_INVITATIONS_ENABLED` und `HEIR_REDEMPTION_ENABLED` nur bei explizitem `true`; Origin/CORS **nicht** als Authentisierung ansehen.
- [ ] Anwendungsquoten mit `consume_heir_rate_limit_atomic` und Schlüssel `actor_id` (verifizierte UUID) erfassen: issue 2/Minute, 5/Stunde; redeem 3/Minute, 10/Stunde; Widerruf nicht limitiert.
- [ ] Eigenständige WAF-/Gateway-Regeln gegen unauthentifizierte Last, Konto-Rotation, feste Zeitfenstergrenzen und übermäßige Fehlversuche vor G1 fachlich freigeben; Quellcodequoten reichen nicht.
- [ ] Alarmgrenzen, Metriken, Stoppschalter, Bereitschaft, Eskalation und datensparsame Logfelder ohne JWT/Token/Hash/UUID-Rohdaten benennen; tatsächliche Betriebsregeln und Secret-Schutz separat nachweisen.
- [ ] Vor-G1-Konzeptfreigabe und spätere G3-Prüfung **wirksamer** Gateway-/Monitoring-Konfiguration getrennt erfassen.

**Statisch sichtbar:** JWT-/Opt-in-/Quotenlogik, JSON-Größenlimits (Ausstellung/Widerruf 1024 Byte, Einlösung 512 Byte). **Offen:** effektive Gateway-/WAF-/Monitoring-Konfiguration.

## #275 – Backup / PITR / Wartung / Notfall (SRE, DBA, Datenschutz)

- [ ] Vor G1 Backup-/PITR-Verfügbarkeit, Wiederherstellbarkeit, Aufbewahrung, RPO/RTO und verantwortliche Betreiber **anhand echter Betriebsnachweise** bestätigen; keine Produktiv-Restore-Aktion.
- [ ] Genehmigten Plan für isolierten Restore-Nachweis (G2), Incident-Runbook, Alarmierung, Vier-Augen-Notfallwiderruf und nicht-destruktive Rückfalloption dokumentieren.
- [ ] Wartungs-RPC aus `20261112070002_heir_rate_limits.sql` abgleichen: Default-Batch 500, zulässig 1–1000, Fenster älter als 48 Stunden, `FOR UPDATE SKIP LOCKED`; **kein Cron/Auto-Delete** im Entwurf.
- [ ] Wartungsrolle und effektive Rechte separat abnehmen; `service_role` soll keinen `EXECUTE`-Zugriff erhalten. Löschintervall und datenschutzrechtliche Aufbewahrungsentscheidung festlegen.
- [ ] Risiken eines PITR für andere zwischenzeitliche Produktivänderungen und STOP bei Token-/Secret-Leak, ACL-/RLS-Abweichungen oder Deadlocks dokumentieren.
- [ ] G0-Voraussetzungen vor G1 und G2-Restore-/Wartungsabnahme getrennt protokollieren.

**Statisch sichtbar:** begrenzte Bereinigungsfunktion und nicht-destruktive Notfallplanung. **Offen:** tatsächlicher Backup-/PITR-/Restore-Status und Betriebsfreigaben.

## Nachweisqualität und Abbruch

Für **jede** Checkliste: prüfende Person, unabhängige freigebende Person, Datum, fixierter Code-SHA, Umgebung, Quellen-/Evidenzlinks, redigierter Soll/Ist-Befund, Abweichungen und explizite Teil-Gate-Entscheidung erfassen. Fehlende Evidenz = **STOP / NO-GO**. Keine personenbezogenen Rohdaten, Secrets, JWTs oder Einladungstoken in GitHub dokumentieren.

**Stand:** nur GitHub-Quelltext gelesen; keine SQL-Ausführung, Supabase-Schreiboperationen, Tests, Merge, Aktivierung oder Deployment.

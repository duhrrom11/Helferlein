# Helferlein – Produktionsfreigabeplan Erbeneinladungen

**Status: NO-GO.** Stand: 2026-11-12. Ausschließlich statische Planung; dieses Dokument führt keine Migration, Prüfung, Freischaltung oder Datenänderung aus. Ergänzt [heir-invitations-production-gate.md](./heir-invitations-production-gate.md). Eine Rolle ist eine Zuständigkeit, keine bereits benannte oder zustimmende Person.

## Verantwortlichkeiten und verbindliche Freigaben

| Rolle | Verantwortlich für | Nachweis |
| --- | --- | --- |
| Produktverantwortliche/r (Owner) | Geschäftliche Quoten, Widerruf-Semantik, Datenschutz und endgültige Aktivierungsentscheidung | Datierte schriftliche Freigabe mit Version/Commit |
| Datenbank-/Supabase-Verantwortliche/r (DBA) | Schema-/Migrationsabgleich, Rechte, Backup, Ausführung, Datenintegrität und Rücksetzentscheidung | Read-only Vorher-/Nachher-Protokoll und Migrationsjournal |
| Security-Verantwortliche/r | JWT-Vertrauensgrenze, SECURITY DEFINER, Gateway-/WAF-Abwehr, Geheimnisse, Auditierung | Signiertes Sicherheitsreview |
| Entwicklungsverantwortliche/r | Deno/TypeScript, Edge Functions, Fehlerfälle, Kompatibilität und Code-Review | Compiler-/Reviewprotokoll und freigegebener Release-Commit |
| Betriebsverantwortliche/r (SRE) | Wartung, Monitoring, Alarmierung, Bereitschaft, Incident und Rollback | Runbook, Alarm-/Restore-Nachweis und Bereitschaftszusage |
| Datenschutzverantwortliche/r | Aufbewahrungsfristen, Zugriff auf personenbezogene UUID-Zähler und Löschkonzept | Datenschutzfreigabe |

Eine Person darf mehrere Rollen ausfüllen, aber Freigaben müssen nachvollziehbar dokumentiert sein. Ohne bestätigte Zuständigkeit: **STOP**.

## Verbindliche Phasen mit Abnahmekriterien

### G0 – Vorbereitende Prüfung, ausschließlich lesend

- [ ] Exakter Release-Commit und unveränderlicher Versionsstand dokumentiert; unabhängiges Code-Review abgeschlossen.
- [ ] Produktionsschema und Migrationshistorie gelesen: `public.vault_cloud_snapshots(owner_user_id uuid)`, `auth.users(id)`, UUID-/FK-Kompatibilität, `gen_random_uuid()`, vorhandene `nachlass_private`-Objekte, gleichnamige Funktionen/Überladungen, Trigger, Löschpfade, RLS und Rollen.
- [ ] Nachweis, dass Migrationen `20261112070000`, `20261112070001`, `20261112070002` noch nicht angewendet sind; bei Abweichung keine unveränderte Ausführung.
- [ ] Alle SECURITY-DEFINER-Funktionen, Eigentümer und tatsächliche `EXECUTE`-Rechte überprüft; nur `service_role` darf die vier operativen RPCs aufrufen, nicht `anon`, `authenticated` oder `PUBLIC`. Wartungsfunktion nur für freigegebenen privilegierten Betreiber.
- [ ] Deno-/TypeScript-Typprüfung mit der festgelegten Supabase-JS-Version; RPC-Thenables, Signaturen und Imports sind kompatibel.
- [ ] Sicherheitsreview für Benutzeridentität aus `auth.getUser`, Gateway `verify_jwt=true`, Service-Role-Secrets ausschließlich serverseitig, Origin/CORS nicht als Authentisierung.
- [ ] Datenschutzkonzept, 48h-Mindestalter der bereinigbaren Zähler, Wartungsrolle und Lösch-/Aufbewahrungsrhythmus freigegeben.
- [ ] Gateway-/WAF-Schutz vor anonymer Last und Konto-Rotation, Monitoring ohne Token/JWT/Hashes, Alarmgrenzen, Bereitschaft und Wiederherstellungsplan genehmigt.
- [ ] Backup-/Restore-Verfahren und realistische Wiederherstellungsziele (RPO/RTO) dokumentiert; Wiederherstellbarkeit außerhalb der Produktion nachgewiesen.
- [ ] Separate Change-Freigabe für Migration und technischen Abnahmeplan erteilt; keine produktiven Testdatensätze.

**STOP**, wenn ein Nachweis fehlt, unklar ist oder ein bestehendes Schema abweicht.

### G1 – Migrationen (nur nach separater Freigabe, nicht durch dieses Dokument)

1. Vorherzustand, Berechtigungen, Migrationshistorie und Backup-Status protokollieren; Wartungsfenster und Verantwortliche bestätigen.
2. `20261112070000_heir_invitations_private_schema.sql`: privates Schema, Einladungen, Zuordnungen, Einlösungs-RPC.
3. `20261112070001_heir_invitations_issue_revoke.sql`: Ausstellungs- und Widerrufs-RPC.
4. `20261112070002_heir_rate_limits.sql`: Zählertabelle, atomare Limitierungs-RPC und eingeschränkte Wartungsfunktion.
5. Nach **jedem** Schritt Migrationsstatus und Objekt-/Rechtezustand read-only nachweisen. Bei Fehler sofort stoppen; nicht blind erneut ausführen. Keine Edge-Function-Aktivierung vor G2/G3.

Abnahme: alle drei Migrationen in korrekter Reihenfolge protokolliert; erwartete Objekte, ACLs, RLS und Funktionsinhaber geprüft; keine unbekannten Nebeneffekte.

### G2 – Technische und Sicherheitsabnahme (gesondert freigegeben, isoliert)

- [ ] Kein Aufruf ohne gültiges JWT; `auth.getUser` bestimmt Eigentümer und Empfänger; keine Identitätsübernahme aus Request-Daten.
- [ ] Ausstellung nur für registrierten Empfänger, kein Selbst-Einladen, maximale Gültigkeit sieben Tage (Edge verwendet sechs Tage), kein Token-Leak.
- [ ] Einlösung nur mit gültigem Token und passendem verifizierten Empfänger; abgelaufene, fremde, widerrufene, bereits akzeptierte und manipulierte Token werden neutral abgewiesen.
- [ ] Widerruf durch Eigentümer funktioniert auch bei erschöpften Ausstellungs-/Einlösequoten; akzeptierte Zuordnung wird ebenfalls widerrufen.
- [ ] Gleichzeitige Ausstellung, Einlösung, Widerruf, Eigentümer-/Empfängerlöschung und FK-/Trigger-Sperrketten untersucht; keine unerwarteten Doppelzuordnungen, Deadlocks oder inkonsistenten Zustände.
- [ ] Limitierung: Ausstellung 2/Minute und 5/Stunde, Einlösung 3/Minute und 10/Stunde je verifiziertem Konto; atomare Zähler unter Parallelität; Zeitfenstergrenzen und konservative Zählung dokumentiert.
- [ ] SQL-/Netzwerk-/RPC-Fehler ergeben neutrale 503, ausgeschöpfte Kontingente 429, fachliche Ablehnungen 404/409; ungültige interne RPC-Argumente sind technische Fehler.
- [ ] Kein Zugriff auf Tresordaten über Erbeneinladungs-RPCs; keine Secrets oder personenbezogenen Rohdaten in Logs.
- [ ] Wartungsfunktion nur mit genehmigter Rolle, maximal 1.000 Datensätze pro Aufruf, ausschließlich Fenster älter als 48 Stunden; Sperrverhalten und Löschmetriken abgenommen.
- [ ] Sicherheits-, Betriebs- und Produktverantwortliche bestätigen das Abnahmeprotokoll.

Keine Tests in der Produktion ohne ausdrücklich separat genehmigten sicheren Plan.

### G3 – Inaktives Bereitstellen und kontrollierte Aktivierung

- [ ] Nach G1/G2: Edge Functions mit `verify_jwt=true` und erforderlichen Server-Secrets bereitstellen; `HEIR_INVITATIONS_ENABLED` und `HEIR_REDEMPTION_ENABLED` bleiben zunächst deaktiviert.
- [ ] Konfiguration, Rechte, Monitoring, Alarmierung und Stoppschalter nochmals unabhängig prüfen.
- [ ] Nur nach schriftlicher Produkt-/Security-/Betriebsfreigabe: serverseitige Opt-ins einzeln und überwacht aktivieren.
- [ ] Frontend `BACKEND_APPROVED=false` bis zur gesonderten finalen UI-Freigabe; kein automatischer Merge oder Release.
- [ ] Nach Aktivierung aggregierte 4xx/5xx-Raten, Quotenüberschreitungen, RPC-Latenz, Fehler und Datenbanklast überwachen; keine Einladungs- oder Authentisierungstoken protokollieren.

**GO** erst, wenn G0–G3 vollständig dokumentiert und ausdrücklich genehmigt sind. Sonst **NO-GO**.

## Rollback, Stoppschalter und Notfallverfahren

**Stufe 1 – sofortige Eindämmung (ohne destruktives Schema-Rollback):**
1. Incident-Verantwortliche/r erklärt STOP und dokumentiert Zeitpunkt, Release und Symptome.
2. Beide serverseitigen Opt-ins deaktivieren; `BACKEND_APPROVED=false` belassen. Bei Bedarf Edge-Endpunkte auf zuletzt freigegebene inaktive Version zurücksetzen. Bereits ausgestellte Tokens werden dadurch nicht automatisch ungültig.
3. Monitoring und Zugangskontrollen prüfen; bei Verdacht auf Secret-Kompromittierung getrenntes, genehmigtes Secret-Rotationsverfahren einleiten.
4. Keine erneuten Migrationen, keine automatische Löschung, keine produktiven Testdatensätze.

**Stufe 2 – Datenintegrität und Wiederherstellung:**
1. Vor jedem Eingriff Backup-/PITR-Verfügbarkeit und abhängige Objekte read-only bewerten.
2. Bereits angenommene Einladungen und Zuordnungen **nicht** durch unüberlegtes `DROP SCHEMA`, `DROP TABLE` oder `CASCADE` löschen.
3. DBA und Security entscheiden über gezielte Vorwärtskorrektur, Deaktivierung oder Wiederherstellung. PITR kann auch andere zwischenzeitliche Produktivänderungen zurücksetzen: Folgen vor Freigabe analysieren.
4. Für kompromittierte Einladungen einen eigentümerautorisierten Widerrufsprozess vorsehen; wenn der Dienst nicht verfügbar ist, gesonderten privilegierten Notfallprozess mit Vier-Augen-Freigabe definieren, **nicht** improvisiert direkt Daten ändern.
5. Nach Wiederherstellung Rechte, RLS, Migrationshistorie, Integrität und Monitoring erneut abnehmen; Reaktivierung nur über G2/G3.

**Auslöser für sofortiges STOP:** ungeklärte Rechte-/RLS-Abweichung, unautorisierte Annahme/Widerruf, Token-/Secret-Leak, wiederholte 503/Deadlocks, unerwartete FK-Kaskaden, stark erhöhte Datenbanklast oder fehlerhafte Zählerbereinigung.

## GitHub-Abnahmeaufgaben (alle offen)

Die folgenden Issues sind die verbindliche Arbeitsliste; ein geschlossenes Issue allein ist **kein** Freigabenachweis. Jede Abnahme erfordert ein datiertes, versionsbezogenes Protokoll und die Zustimmung der benannten Rolle.

| Priorität | Issue | Gate | Nachweis |
| --- | --- | --- | --- |
| P0 | [#270 – Produktionsschema und Migrationshistorie](https://github.com/duhrrom11/Helferlein/issues/270) | G0 | Schema-/Historienabgleich |
| P0 | [#271 – SECURITY DEFINER, Rollen und RLS](https://github.com/duhrrom11/Helferlein/issues/271) | G0/G1 | Rechte-/Owner-Audit |
| P0 | [#272 – SQL- und TypeScript-Verträge](https://github.com/duhrrom11/Helferlein/issues/272) | G0/G2 | Compiler-/SQL-Abnahme |
| P1 | [#273 – Parallelität und Datenintegrität](https://github.com/duhrrom11/Helferlein/issues/273) | G2 | Isolierte Parallelitätsabnahme |
| P1 | [#274 – Gateway-Schutz und Monitoring](https://github.com/duhrrom11/Helferlein/issues/274) | G0/G3 | Security-/Betriebsfreigabe |
| P1 | [#275 – Backup, Wartung und Notfallverfahren](https://github.com/duhrrom11/Helferlein/issues/275) | G0/G2 | Restore-/Wartungsnachweise |
| P1 | [#276 – Authentisierung, Tokens und Quoten](https://github.com/duhrrom11/Helferlein/issues/276) | G2 | Sicherheits-/Funktionsabnahme |
| P2 | [#277 – Verantwortliche und Release-Freigaben](https://github.com/duhrrom11/Helferlein/issues/277) | G3 | Unterschriebene GO-Entscheidung |

**Bearbeitungsreihenfolge:** zuerst #270–#272, anschließend #273–#276, abschließend #277. P1-Aufgaben dürfen parallel vorbereitet werden; kein produktiver Schritt darf einen noch offenen Gate-Nachweis umgehen.

## P0-Zwischenstand – rein lesende Metadatenprüfung (2026-11-12)

**Projekt:** `avapuibsidubuzxjtyld` (Helferlein), Status `ACTIVE_HEALTHY`, PostgreSQL 17.11. Die Prüfung verwendete nur Supabase-Projekt-/Tabellen-/Migrations-/Extension-Metadaten und GitHub-Dateiinhalte, **keine SQL-Ausführung**. Der Projektstatus ist kein Sicherheitsfreigabenachweis.

| Issue | Positiv nachgewiesen | Noch offen / Freigabeblocker |
| --- | --- | --- |
| [#270](https://github.com/duhrrom11/Helferlein/issues/270) | `public.vault_cloud_snapshots(owner_user_id)`: UUID-PK, RLS aktiv, FK auf `auth.users(id)`; `auth.users` vorhanden. Drei Erben-Migrationsversionen fehlen in der registrierten Migrationshistorie; Tabellenauflistung `nachlass_private` leer. | Schemaexistenz, gleichnamige Funktionen/Überladungen, Trigger, tatsächliche Definitionen und Löschpfade nicht vollständig inventarisiert. Fehlende Migrationsversionen beweisen nicht die Abwesenheit manueller Objekte. |
| [#271](https://github.com/duhrrom11/Helferlein/issues/271) | Migrationstext enthält `SECURITY DEFINER`, eingeschränkten `search_path`, `REVOKE`/`GRANT` und RLS-Vorgaben für die privaten Tabellen. | Effektive Funktionsinhaber, ACLs, vererbte Rollen, Schema-USAGE, Default Privileges und RLS-Policies nicht aus den verfügbaren Metadaten bestätigt. Nicht ausgeführter SQL-Text ist kein produktiver Rechtenachweis. |
| [#272](https://github.com/duhrrom11/Helferlein/issues/272) | RPC-Namen, `PromiseLike`-Adapter, `verify_jwt=true`, SQLSTATE 22023 bei ungültigen Limiter-Argumenten und installiertes `plpgsql` statisch/über Metadaten bestätigt. | Keine SQL-Parserprüfung, kein Deno-/TypeScript-Compilerlauf, keine tatsächliche Supabase-JS-Typkompatibilitätsprüfung und keine Laufzeit-/Parallelitätsabnahme. |

**Entscheidung:** #270, #271 und #272 bleiben **P0 OFFEN / NO-GO**. Die P0-Nachweise dürfen erst nach unabhängiger Prüfung und dokumentierter Freigabe als erledigt markiert werden. Keine produktiven Tests oder SQL-Ausführung ohne separate Genehmigung.

## P1-Zwischenstand – rein lesende Sicherheitsprüfung (2026-11-12)

Quellen: SQL-Migrationen 70000–70002, beide Edge Functions, gemeinsame Auth-/Rate-Limit-/HTTP-Module, `supabase/config.toml`, Supabase-Projekt-, Migrations- und Edge-Function-Metadaten. **Keine SQL-Ausführung, keine Tests und keine Betriebsprüfung.** Projekt meldet PostgreSQL 17.11 und `ACTIVE_HEALTHY`; keine registrierten Erben-Migrationen und `list_edge_functions` meldet **keine bereitgestellten Funktionen**. Dies beweist keine vollständige Abwesenheit anderweitig erreichbarer Dienste.

| Issue | Bestätigter statischer Teilnachweis | Offener Abnahmeblocker |
| --- | --- | --- |
| [#273 – Parallelität](https://github.com/duhrrom11/Helferlein/issues/273) | Eigentümerzeile vor Einladung gesperrt; Empfänger `FOR KEY SHARE`; Zuordnungs-PK und Unique-/FK-Regeln vorgesehen. | Parallelitäts-/Deadlock-Verhalten, Löschpfade, Trigger, Integrität und Konfliktfehler nicht technisch abgenommen. |
| [#274 – Gateway und Monitoring](https://github.com/duhrrom11/Helferlein/issues/274) | `verify_jwt=true`, `auth.getUser`, Request- und Origin-Prüfung, serverseitige Opt-in-Flags und benutzerbezogene Quoten im Code. | WAF/Abuse-Schutz über Konten hinweg, effektive Gateway-/Log-/Alarm-/Secret-Konfiguration nicht belegt. |
| [#275 – Backup und Notfall](https://github.com/duhrrom11/Helferlein/issues/275) | Wartungs-RPC mit maximal 1.000 Zeilen, 48h-Altersgrenze, `SKIP LOCKED`; dokumentierter nicht-destruktiver Rückfall. | Tatsächliche PITR-/Restore-Fähigkeit, RPO/RTO, Betreiberrolle, Wartungsintervall, Retention und Notfallfreigabe nicht nachgewiesen. |
| [#276 – Authentisierung und Quoten](https://github.com/duhrrom11/Helferlein/issues/276) | Verifizierte Benutzeridentität, Token-Hash, Empfängerbindung, Widerruf ohne Quote, 2/5-Ausstellung und 3/10-Einlösung sowie neutrale HTTP-Fehlerbehandlung im Entwurf. | Isolierte technische Abnahme von JWT-/Token-/Quota-/Fehlerpfaden, Compiler- und Laufzeitkompatibilität ausstehend. |

**Entscheidung:** Alle vier P1-Issues bleiben **OFFEN / NO-GO**. Quellcode- und Metadatenbefunde ersetzen keine Sicherheits-, Betriebs- oder Restore-Abnahme. P0 bleibt ebenfalls offen; keine Freigabe für Migration, Merge, Deployment oder Aktivierung.

## P2-Zwischenstand – formale Release-Freigabe (2026-11-12)

**Issue:** [#277 – Freigabeverantwortliche, Release-Commit und Aktivierungsfenster](https://github.com/duhrrom11/Helferlein/issues/277). Nur GitHub-Dokumente und read-only Supabase-Projekt-/Migrations-/Edge-Metadaten geprüft; **keine SQL-Ausführung, keine Tests, keine Supabase-Schreiboperationen**.

**Bestätigt:** Der Sicherheitsbranch existiert; sechs Zuständigkeitsrollen, G0–G3, drei Migrationsschritte, `verify_jwt=true`, die getrennten serverseitigen Opt-in-Flags, `BACKEND_APPROVED=false` und nicht-destruktive Notfallmaßnahmen sind beschrieben. Supabase meldet `ACTIVE_HEALTHY` (PostgreSQL 17.11), keine registrierten Erben-Migrationen und keine bereitgestellten Edge Functions. Der Projektstatus ist kein Freigabenachweis.

**Nicht bestätigt:** namentliche Rollenzuweisungen, datierte Unterschriften, unabhängiges Review, fixierter und abgenommener Release-Commit, P0-/P1-Abnahmeprotokolle, Datenschutz-/DBA-/Security-/SRE-Freigaben, Wartungs-/Aktivierungs- und Rollbackfenster sowie die schriftliche GO-Entscheidung. Der Branchname und der letzte Dokumentations-Commit ersetzen keinen freigegebenen Release-Commit. Alle G0–G3-Freigabefelder bleiben offen.

**Entscheidung: P2 OFFEN / NO-GO.** Keine Migration, Aktivierung, Merge oder Deployment, solange die vorgelagerten Gates und diese formalen Nachweise fehlen.

## Freigabeprotokoll (vor Aktivierung auszufüllen)

| Feld | Erforderlicher Eintrag |
| --- | --- |
| Git-Commit/Release | Offen |
| DBA-/Migrationsfreigabe | Offen |
| Security-Freigabe | Offen |
| Produkt-/Datenschutzfreigabe | Offen |
| Betriebs-/Notfallfreigabe | Offen |
| Technische Abnahme | Offen |
| Backup-/Restore-Nachweis | Offen |
| Aktivierungsfenster und Verantwortliche | Offen |
| Entscheidung mit Datum | **NO-GO** |

Dieses Dokument ist ein Plan und **keine** Freigabe oder Ausführungsanweisung für die aktuelle Unterhaltung.

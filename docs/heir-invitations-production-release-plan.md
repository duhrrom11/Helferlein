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

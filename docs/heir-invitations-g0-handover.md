# Helferlein – G0-Übergabe an Verantwortliche (Erbeneinladungen)

**Stand:** 2026-11-12 · **Status: NO-GO** · **Nur dokumentarische Übergabe**, keine bereits erfolgte Zuweisung, Prüfung oder Freigabe. Geltungsbereich: Issues [#270](https://github.com/duhrrom11/Helferlein/issues/270), [#271](https://github.com/duhrrom11/Helferlein/issues/271), [#272](https://github.com/duhrrom11/Helferlein/issues/272), [#274](https://github.com/duhrrom11/Helferlein/issues/274), [#275](https://github.com/duhrrom11/Helferlein/issues/275). Maßgeblich sind [G0-Nachweischecklisten](./heir-invitations-g0-evidence-checklists.md), [GO/NO-GO-Matrix](./heir-invitations-go-no-go-matrix.md), [Abnahmevorlage](./heir-invitations-acceptance-evidence-template.md) und [Produktionsfreigabeplan](./heir-invitations-production-release-plan.md).

## Übergabe nach Rolle

| Rolle | Verantwortliche Issues und G0-Nachweise | Abhängigkeiten / Übergabepartner | STOP-Kriterien |
| --- | --- | --- | --- |
| **DBA** (federführend #270, gemeinsam #271/#272/#275) | Read-only Soll/Ist-Schema und Migrationshistorie; UUID-/FK-/Trigger-/Löschpfade, `nachlass_private`-Existenz, Überladungen; tatsächliche Funktionsinhaber, ACL, RLS, Schema-USAGE, Default Privileges; SQL-Vertragsreview; Backup-/PITR-Freigabe und Migrationsvorbedingungen | #270 ist Basis für #271 und #272; Abstimmung mit Security bei Rechteprüfung, Entwicklung bei SQL-Verträgen und SRE bei Backup. Vor G1 schriftliche Change-Freigabe zusätzlich erforderlich | Nicht inventarisierte Objekte, Schema-/Migrationskonflikte, unbekannte `SECURITY DEFINER`-Owner, unklare ACL/RLS, fehlende Backup-Bestätigung oder unbenannte DBA-Rolle |
| **Security** (gemeinsam #271/#274) | Unabhängiges Rollen-/RLS-/RPC-Sicherheitsreview; `auth.getUser`/`verify_jwt=true`-Vertrauensgrenze; WAF-/Gateway-Konzept gegen anonyme Last/Konto-Rotation; Secrets-/Logschutz, Alarm- und Stoppschwellen | #270-Schema-Baseline; #272-Code-Baseline; SRE für wirksames Monitoring. G0-Konzept vor G1, erneute Betriebsprüfung in G3 | Clientzugriff auf privilegierte RPCs, nicht bewertete Überladungen, fehlender Missbrauchsschutz, Token-/JWT-/Hash-Leaks, fehlendes unabhängiges Review |
| **Entwicklung** (federführend #272) | Fixierter vollständiger Code-SHA; unabhängiges Code-Review; nach gesonderter Freigabe SQL-Parser- und Deno/TypeScript-Compilerprotokolle mit `@supabase/supabase-js@2.57.0`; RPC-Signaturen/Argumente/Ergebnisse, `PromiseLike`, Imports und Fehlerklassifikation | #270-Datenbankschema; DBA für SQL-Verträge; Security für JWT-/Secret-Grenze. G2-Laufzeitabnahme bleibt getrennt | Kein fixierter Code-Stand, fehlende oder fehlerhafte Compiler-/Parsernachweise, ungeklärte `NULL`/`false`/SQL-Fehlerabbildung, ungeprüfte Imports |
| **SRE** (federführend #275, gemeinsam #274) | Nachweis tatsächlicher Backup-/PITR-Verfügbarkeit, RPO/RTO und Wiederherstellbarkeit vor G1; Incident-/Rollback-/Bereitschaftsplan; WAF-/Monitoring-Konzept, Alarmgrenzen, Eskalation und Stoppschalter | DBA für Backup-/Migrationsvorbedingungen; Security für WAF/Logs; Datenschutz für Retention. Isolierter Restore-Nachweis später in gesondert genehmigtem G2 | Unbekannte Wiederherstellbarkeit, fehlende Bereitschaft/Alarme, ungeklärte PITR-Auswirkungen auf andere Daten, fehlende Betriebsfreigabe |
| **Datenschutz** (gemeinsam #275, Querschnitt #274) | Zählerdatenminimierung, Retention/Löschrhythmus, manuelle Wartungsrolle, Logs ohne sensible Rohdaten, Vier-Augen-Notfallverfahren fachlich freigeben | SRE für Wartungs-/Incidentplan; DBA für effektive Wartungsrechte; Security für Log-/Secret-Konzept | Keine genehmigte Aufbewahrung, unkontrollierte UUID-/Token-/Hash-Logs, ungeklärte Bereinigungsrechte oder Notfallzugriffe |
| **Produkt** (G0-Governance, später #277) | Namentliche Zuständigkeiten und Prüfer/Freigeber bestätigen, Geschäftsquoten und Widerrufssemantik prüfen, unabhängige Reviews und fixierten Release-SHA nachverfolgen | Fachliche G0-Nachweise aller obigen Rollen; finale Aktivierungsfreigabe erst nach G1–G3-Voraussetzungen | Nicht benannte Verantwortliche, fehlende schriftliche Teil-Gate-Freigaben, fehlender Release-SHA oder offene fachliche Risiken |

**Rollen sind keine Personen:** Keine namentlichen Zuweisungen oder Unterschriften liegen vor. Eine Person kann mehrere Rollen tragen; unabhängige Prüfung und Freigabe müssen trotzdem nachvollziehbar bleiben.

## Reihenfolge der Übergaben

1. **Produkt / Entwicklung:** Rollen und unabhängig prüfende Personen benennen; unveränderlichen **Code**-Release-SHA mit Reviewbasis fixieren. GitHub-Dokumentationscommits sind keine Codefreigabe.
2. **DBA → Security / Entwicklung:** #270-Soll/Ist-Inventar und Konfliktbewertung vorlegen. Die früher gelesenen Supabase-Metadaten zeigen keine registrierten Erben-Migrationsversionen und keine privaten Tabellen; das beweist nicht, dass Schema oder Funktionen fehlen.
3. **DBA + Security:** #271-Ist-Rechte/RLS/Owner/Überladungen für G0 prüfen. Eine erneute **G1-Nachprüfung** ist später separat erforderlich.
4. **Entwicklung + DBA:** #272-Parser-/Compiler-/RPC-Verträge nach separater Freigabe abnehmen; G2-Laufzeitnachweise nicht vorwegnehmen.
5. **Security + SRE:** #274-WAF-/Abuse-/Monitoring-Konzept für G0 freigeben; wirksame Gateway-Konfiguration erst in G3 gesondert prüfen.
6. **SRE + DBA + Datenschutz:** #275-Backup-/PITR-/RPO-/RTO-/Notfallvoraussetzungen vor G1 nachweisen; isolierte Restore-/Wartungsabnahme ist ein späterer, gesondert genehmigter G2-Schritt.
7. **G0-Entscheidung:** Jede Rolle hinterlegt datierte, redigierte Evidenz mit fixiertem Code-SHA, Umgebung, Soll/Ist-Befund, unabhängiger Bestätigung und schriftlicher Teil-Gate-Entscheidung. Erst **nach** vollständigem G0 ist eine **separate** Change-GO-Entscheidung für G1 überhaupt zu erwägen.

Die Schritte 3–6 können vorbereitend parallel laufen, sobald ihre Quellenbaselines feststehen; ihre Teilfreigaben ersetzen einander nicht. Ein noch offenes Issue mit späteren G1/G2/G3-Anforderungen kann G0-Teilfreigaben dokumentieren, aber nicht allein durch G0 als vollständig erledigt gelten.

## Gemeinsame STOP-Regeln

- **STOP bei fehlender Evidenz:** Kein tatsächlicher Ist-Nachweis, fehlende unabhängige Bestätigung, kein datierter Freigabevermerk oder unklarer Code-SHA.
- **STOP bei Datenbankabweichung:** Bereits vorhandenes `nachlass_private`, unerwartete RPC-Überladung/Trigger/FK, nicht geklärte Migrationshistorie, unsichere Rechte oder RLS.
- **STOP bei Sicherheitslücke:** Unklare Authentisierungsgrenze, privilegierter Clientzugriff, unzureichender Gateway-/Abuse-Schutz, Secret-/Token-Leak oder unzulässige Logdaten.
- **STOP bei Betriebsrisiko:** Nicht nachgewiesene Backup-/PITR-Wiederherstellbarkeit, fehlendes RPO/RTO, ungeklärter Wartungszugriff, fehlender Incident-/Rollbackplan oder fehlende SRE-Bereitschaft.
- **STOP bei Freigabemangel:** Unbenannte Verantwortliche, fehlende Datenschutz-/DBA-/Security-/SRE-Nachweise oder nicht freigegebene Prüfung verhindern G0. Eine fehlende gesonderte G1-Change-Genehmigung verhindert **G1**, ist aber nicht selbst Voraussetzung für den Abschluss von G0.

## Übergabeprotokoll – vollständig offen

| Feld | Stand |
| --- | --- |
| Namentliche Zuständigkeiten / Stellvertretungen | Offen |
| Fixierter Code-Release-Commit und unabhängiges Review | Offen |
| #270 – DBA G0 | NO-GO |
| #271 – DBA/Security G0 | NO-GO |
| #272 – Entwicklung/DBA G0 | NO-GO |
| #274 – Security/SRE G0 | NO-GO |
| #275 – SRE/DBA/Datenschutz G0 | NO-GO |
| Produktseitige Koordination und schriftliche G0-Entscheidung | Offen |
| Separate Change-Genehmigung für späteres G1 | Nicht erteilt |
| **Gesamt** | **NO-GO** |

**Sicherheitsgrenze:** Diese Übergabe wurde nur aus GitHub-Dokumentation und früher dokumentierten read-only Befunden erstellt. Keine SQL-Ausführung, keine Supabase-Schreiboperationen, keine Tests, kein Merge, keine Aktivierung und kein Deployment.

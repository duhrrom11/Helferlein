# Helferlein – G0-Freigabecheckliste und rollenbezogene Übergabeentscheidung

**Stand: 2026-11-12 · Aktuelle Entscheidung: NO-GO.** Dieses Dokument ist eine **unterschriftsfreie Vorlage**, keine erteilte Freigabe. Gilt für G0 der Issues [#270](https://github.com/duhrrom11/Helferlein/issues/270), [#271](https://github.com/duhrrom11/Helferlein/issues/271), [#272](https://github.com/duhrrom11/Helferlein/issues/272), [#274](https://github.com/duhrrom11/Helferlein/issues/274), [#275](https://github.com/duhrrom11/Helferlein/issues/275). Referenzen: [G0-Übergabe](./heir-invitations-g0-handover.md), [Detailchecklisten](./heir-invitations-g0-evidence-checklists.md), [Abnahmeprotokoll](./heir-invitations-acceptance-evidence-template.md), [Freigabeplan](./heir-invitations-production-release-plan.md), [GO/NO-GO-Matrix](./heir-invitations-go-no-go-matrix.md).

## Entscheidungskonvention

- **NO-GO (aktuell):** Nachweise, Personen, unabhängige Reviews oder schriftliche Teilentscheidungen fehlen. Kein „GO“ aus einer Checkbox oder statischem Quellcode ableiten.
- **G0-Teil-GO (nur später, schriftlich):** Eine benannte Rolle bestätigt **nur ihren G0-Anteil** mit datiertem, versioniertem Soll/Ist-Protokoll und unabhängiger Gegenprüfung. Ein G0-Teil-GO ist weder G1-Change-GO noch G2/G3- oder Aktivierungs-GO.
- **G0-Gesamt-GO (nur später, schriftlich):** Alle nachstehenden Rollenentscheidungen und G0-Voraussetzungen sind nachgewiesen und unabhängig bestätigt. Erst danach darf eine **eigenständige** Change-Entscheidung für G1 erwogen werden.
- **STOP:** Jeder fehlende oder widersprüchliche Nachweis, unklare Rechte, fehlende Wiederherstellbarkeit oder unbenannte Verantwortliche halten das Gate auf NO-GO. Issues mit späteren G1/G2/G3-Anteilen bleiben bis zu deren Abnahme offen.

## Rollenbezogene Freigabe- und Übergabematrix

| Rolle / G0-Verantwortung | Nachweise, die für die Teilentscheidung vorliegen müssen | Übergabe an / Abhängigkeit | Entscheidung heute |
| --- | --- | --- | --- |
| **DBA** – #270, #271, #272, #275 | [ ] Read-only Ist/Soll-Inventar inkl. `nachlass_private`, Migrationen, Trigger/FK/Löschpfade; [ ] effektive Owner/ACL/RLS/Default Privileges; [ ] SQL-RPC-Vertragsreview; [ ] Backup-/PITR-Voraussetzungen mit SRE | Zuerst #270-Baseline; danach Security für #271, Entwicklung für #272, SRE für #275. **STOP:** Schema-Konflikt, unbekannte Überladung/Rechte, fehlendes Backup | **NO-GO – Person und Nachweise offen** |
| **Security** – #271, #274 | [ ] Unabhängiger SECURITY-DEFINER-/Rollen-/JWT-Review; [ ] WAF-/Gateway-Abuse-Konzept vor G1; [ ] Secret-/Logschutz, Alarm- und STOP-Schwellen | DBA-Schema-/ACL-Baseline und Entwicklungscode; SRE für Monitoring. **STOP:** privilegierter Clientzugriff, unbekannte Auth-Grenze, fehlender Schutz vor Konto-Rotation | **NO-GO – Person und Nachweise offen** |
| **Entwicklung** – #272 | [ ] Vollständiger fixierter **Code**-SHA und unabhängiges Review; [ ] separat genehmigte SQL-Parser-/Deno-TypeScript-Protokolle; [ ] RPC-Signaturen, `PromiseLike`, `@supabase/supabase-js@2.57.0`, Fehlerklassen | DBA-Schema und Security-JWT/Secrets. **STOP:** kein fixierter SHA, fehlende Compiler-Evidenz oder ungeklärter RPC-Vertrag | **NO-GO – Person und Nachweise offen** |
| **SRE** – #274, #275 | [ ] Tatsächliche Backup-/PITR-Verfügbarkeit und Wiederherstellbarkeit vor G1, RPO/RTO; [ ] Incident-/Rollback-/Bereitschaftsplan; [ ] Gateway-/Monitoring-/Alarmkonzept | DBA für Migration/Backup, Security für WAF, Datenschutz für Retention. **STOP:** fehlende Restore-Basis, Alarme, Bereitschaft oder Incident-Verantwortung | **NO-GO – Person und Nachweise offen** |
| **Datenschutz** – #275, Querschnitt #274 | [ ] Genehmigte Zähler-Retention, Löschrhythmus, Wartungsrolle; [ ] datensparsame Logs; [ ] Vier-Augen-Notfallverfahren | SRE-Runbook und DBA-Wartungsrechte; Security-Logging. **STOP:** ungeklärte Aufbewahrung, Zugriff oder Rohdaten in Logs | **NO-GO – Person und Nachweise offen** |
| **Produkt** – G0-Koordination / spätere #277 | [ ] Alle verantwortlichen und unabhängig prüfenden Personen benannt; [ ] fachliche Quoten-/Widerrufsentscheidung; [ ] vollständige G0-Teilentscheidungen und fixierte Code-Baseline erfasst | Benötigt DBA, Security, Entwicklung, SRE, Datenschutz. **STOP:** offene Rolle, unvollständige Teilfreigabe oder nicht geprüfte Fachentscheidung | **NO-GO – Person und Nachweise offen** |

**Wichtig:** Rollen sind nicht namentlich zugewiesen. Eine Person darf mehrere Rollen übernehmen, aber unabhängige Bestätigung muss nachvollziehbar bleiben; kein Selbstfreigabeersatz.

## Formale Entscheidungsfelder – je Rolle einzeln auszufüllen

| Rolle | Name / Stellvertretung | G0-Nachweislink, fixierter Code-SHA, Prüfumgebung | Unabhängige Prüfung (Name/Datum) | Schriftliche G0-Teilentscheidung (Datum/Begründung) |
| --- | --- | --- | --- | --- |
| DBA | Offen | Offen | Offen | **NO-GO** |
| Security | Offen | Offen | Offen | **NO-GO** |
| Entwicklung | Offen | Offen | Offen | **NO-GO** |
| SRE | Offen | Offen | Offen | **NO-GO** |
| Datenschutz | Offen | Offen | Offen | **NO-GO** |
| Produkt | Offen | Offen | Offen | **NO-GO** |

## Gesamt-G0-Entscheidung – alle Punkte offen

- [ ] Vollständiger Code-Release-SHA fixiert; unabhängiges Review datiert und verlinkt. Dokumentations-Commits sind keine Code-Freigabe.
- [ ] #270-Schema-/Migrations-/Objektinventar mit dokumentierter Konfliktbewertung abgenommen.
- [ ] #271-Ist-Rechte/Owner/RLS-Review für **G0** abgenommen; spätere G1-Nachprüfung separat eingeplant.
- [ ] #272-SQL-/Deno-/RPC-Vertragsprüfung für **G0** mit tatsächlich freigegebenen Parser-/Compilerprotokollen abgenommen; G2-Laufzeitprüfung bleibt offen.
- [ ] #274-Gateway-/WAF-/Abuse-/Monitoring-Konzept für **G0** abgenommen; wirksame G3-Konfiguration bleibt offen.
- [ ] #275-Backup-/PITR-/RPO-/RTO-/Notfallvoraussetzungen für **G0** nachgewiesen; isolierter G2-Restore bleibt offen.
- [ ] Alle sechs Rollen namentlich bestätigt, ihre unabhängigen Gegenprüfungen dokumentiert und Teil-Gate-Entscheidungen unterschrieben.
- [ ] Datenschutz, Secrets/Logs, fachliche Quoten und Widerrufssemantik mit eindeutiger STOP-/Abweichungsbehandlung bewertet.
- [ ] Für die **nachgelagerte** G1-Change-Entscheidung sind zuständige Personen und ein eigener Freigabeprozess benannt; die tatsächliche G1-Change-Genehmigung ist **keine G0-Abnahmevoraussetzung**, sondern erfolgt erst nach G0-Gesamt-GO.

**Aktueller Gesamtentscheid: NO-GO.** Entscheidende Person: **offen** · Datum der formalen Freigabe: **offen** · Freigabenachweis: **fehlt** · G1-Change-GO: **nicht erteilt**.

**Sicherheitsgrenze:** Ausschließlich GitHub-Dokumentation; keine SQL-Ausführung, keine Supabase-Schreiboperationen, keine Tests, kein Merge, keine Aktivierung und kein Deployment.

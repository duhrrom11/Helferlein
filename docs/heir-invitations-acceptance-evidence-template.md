# Erbeneinladungen – Abnahmeprotokoll-Vorlage (nicht ausgefüllt)

**Status: NO-GO.** Diese Vorlage ist eine dokumentarische Arbeitshilfe für die [GO/NO-GO-Matrix](./heir-invitations-go-no-go-matrix.md) und den [Produktionsfreigabeplan](./heir-invitations-production-release-plan.md). Sie ist **kein** Nachweis einer erfolgten Prüfung, keine Freigabe und keine Anweisung zur Ausführung. Stand: 2026-11-12.

## Einheitlicher Nachweisdatensatz (pro Gate und Issue separat)

| Pflichtfeld | Eintrag |
| --- | --- |
| Issue / Gate / Teil-Gate | **Offen** |
| Prüfumgebung (isoliert/Produktion, Zweck) | **Offen** |
| Fixierter Code-Commit (vollständiger SHA) | **Offen** |
| Migration / Version / Konfiguration | **Offen** |
| Prüfer:in / Rolle / Datum | **Offen** |
| Unabhängige:r Freigebende:r / Rolle / Datum | **Offen** |
| Genehmigung zur Durchführung, falls erforderlich | **Offen** |
| Prüfmethode und freigegebener Umfang | **Offen** |
| Sollzustand und Istbefund (redigiert) | **Offen** |
| Evidenzlink (ohne personenbezogene Rohdaten/Secrets) | **Offen** |
| Abweichungen, Korrekturen und erneute Prüfung | **Offen** |
| Teil-Gate-Entscheidung GO/NO-GO mit Begründung | **NO-GO – noch nicht geprüft** |

**Datenschutz:** Keine JWTs, Einladungs- oder Recovery-Tokens, Secret-Werte, Hashes, Personen-UUIDs oder ungefilterte produktive Logs in GitHub ablegen. Freigabe und Nachweise nur durch zuständige Personen bestätigen lassen.

## Checklisten je Issue – noch keine Abnahmen

| Issue | Vorbereitende Evidenz (G0) | Nachgelagerte Evidenz | Rollen |
| --- | --- | --- | --- |
| [#270](https://github.com/duhrrom11/Helferlein/issues/270) | Read-only Schema-/Migrationsinventar, Objekt- und Triggerabweichungen, bestehende RPCs | Bei Änderungen neuer Soll/Ist-Abgleich | DBA |
| [#271](https://github.com/duhrrom11/Helferlein/issues/271) | Ist-Rechte/RLS/Owner, Default Privileges, Überladungen | G1-Nachweis nach jedem separat genehmigten Migrationsschritt | DBA, Security |
| [#272](https://github.com/duhrrom11/Helferlein/issues/272) | Fixierter SHA, SQL-Parser- und Deno/TypeScript-Typprüfbericht nach separater Freigabe | G2 RPC-/Laufzeit-/Fehlerpfadkompatibilität | Entwicklung, DBA |
| [#273](https://github.com/duhrrom11/Helferlein/issues/273) | Abnahmeplan und isolierte Umgebung separat genehmigen | G2 Race-/Deadlock-/FK-/Trigger-/Löschpfadprotokoll | Entwicklung, DBA |
| [#274](https://github.com/duhrrom11/Helferlein/issues/274) | WAF-/Abuse-/Monitoring-/Datenschutzkonzept vor G1 | G3 wirksame Gateway-Konfiguration, Alarme, Bereitschaft | Security, SRE |
| [#275](https://github.com/duhrrom11/Helferlein/issues/275) | Backup/PITR, RPO/RTO, Wiederherstellbarkeit und Notfallplan vor G1 | G2 genehmigter isolierter Restore-/Wartungsnachweis | SRE, DBA, Datenschutz |
| [#276](https://github.com/duhrrom11/Helferlein/issues/276) | Sicherheitsplan und isolierte Umgebung genehmigen | G2 JWT-/Token-/Quoten-/HTTP-/Widerrufsabnahme | Security, Entwicklung |
| [#277](https://github.com/duhrrom11/Helferlein/issues/277) | Namen, Rollen, Review, Release-SHA und fachliche Freigaben | G3 inaktive Konfiguration geprüft; schriftliches Aktivierungs-GO **vor** Aktivierung; danach Betriebsnachweis | Produkt, Security, SRE; DBA, Entwicklung, Datenschutz als Zulieferer |

## Abhängigkeiten und STOP-Regeln

1. **G0:** #270, #271-Vorabprüfung, #272-Vorabprüfung sowie #274/#275-Voraussetzungen dokumentieren; Rollen benennen und Code-SHA fixieren. Keine G1-Freigabe ohne vollständige, unabhängige Vorabnachweise.
2. **G1:** Nur nach eigenständiger Change-Genehmigung durch autorisierte Verantwortliche; nach jedem Schritt read-only Ist-Nachweise. Keine Ausführung im Rahmen dieser Dokumentation.
3. **G2:** Separat genehmigte isolierte technische Abnahmen; offene G2-Teilnachweise verhindern G3.
4. **G3:** Inaktive Bereitstellung und wirksame Betriebsprüfung; erst anschließend schriftliches Aktivierungs-GO. Kein zirkulärer Nachweis einer bereits erfolgten Aktivierung vor GO.
5. **Nach Änderungen:** Betroffene Nachweise gegen neuen fixierten SHA erneut bewerten. Ein geschlossener Issue-Status ersetzt keine unterschriebene Entscheidung.

**Aktuell:** 0 von 8 Issues formal abgenommen. **Gesamt: NO-GO.** Keine SQL-Ausführung, keine Supabase-Schreiboperationen, keine Tests, kein Merge, keine Aktivierung und kein Deployment.

# Helferlein – konsolidierte GO/NO-GO-Freigabematrix Erbeneinladungen

**Stand:** 2026-11-12 · **Gesamtentscheidung: NO-GO** · Branch: `security/heir-invitations-static-review`. Diese Matrix ist ausschließlich Dokumentation; sie autorisiert weder SQL-Ausführung noch Supabase-Schreibzugriffe, Tests, Merge, Aktivierung oder Deployment.

**Quellen:** [Produktionsfreigabeplan](./heir-invitations-production-release-plan.md), [Sicherheitsgate](./heir-invitations-production-gate.md), GitHub-Issues #270–#277 und deren dokumentierte rein lesende Zwischenprüfungen. Alle acht Issues sind offen. Statische Nachweise sind keine technischen oder personengebundenen Abnahmen.

## Nachweismatrix und Abhängigkeiten

| Reihenfolge | Priorität / Issue | Gate | Zuständige Rolle(n), noch nicht namentlich bestätigt | Statisch belegter Stand | Noch erforderlicher prüfbarer Nachweis | Voraussetzung | Entscheidung |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 [#270 Schema/Migrationen](https://github.com/duhrrom11/Helferlein/issues/270) | G0 | DBA | UUID-PK/FK von `vault_cloud_snapshots` und `auth.users` bestätigt; Erben-Migrationen nicht registriert; private Tabellen nicht gelistet | Signiertes Objekt-/Schema-/Historieninventar inkl. RPC-Überladungen, Triggern, Löschpfaden, Differenzen und Konfliktbewertung | Keine | **NO-GO** |
| 2 | P0 [#271 Rollen/RLS](https://github.com/duhrrom11/Helferlein/issues/271) | G0, G1-Nachprüfung | DBA, Security | `SECURITY DEFINER`, `REVOKE`/`GRANT`, RLS und eingeschränkter Suchpfad im SQL-Entwurf | Read-only Ist-ACL-/Owner-/RLS-/Default-Privilege-Audit; nach später separat genehmigter Migration erneuter Ist-Nachweis | #270 | **NO-GO** |
| 3 | P0 [#272 SQL/Deno-Verträge](https://github.com/duhrrom11/Helferlein/issues/272) | G0/G2 | Entwicklung, DBA | RPC-Signaturen, `PromiseLike`, JWT-Gateway und PostgreSQL-Version statisch dokumentiert | Genehmigte SQL-/Deno-/TypeScript-Compilerprotokolle mit festem Commit und Supabase-JS-Version, Fehler-/RPC-Typprüfung | #270; Code-Stand fixieren | **NO-GO** |
| 4 | P1 [#275 Backup/Notfall](https://github.com/duhrrom11/Helferlein/issues/275) | G0/G2 | SRE, DBA, Datenschutz | Begrenzte 48h-Zählerbereinigung und nicht-destruktive Notfallplanung dokumentiert | Backup-/PITR-Status, RPO/RTO, genehmigter isolierter Restore-Nachweis, Wartungs- und Retention-Konzept, Notfall-Rollen | #270; vor G1 zwingend | **NO-GO** |
| 5 | P1 [#274 Gateway/Monitoring](https://github.com/duhrrom11/Helferlein/issues/274) | G0/G3 | Security, SRE | JWT-, Request-, Opt-in- und kontoabhängige Quotenregeln im Code | Freigegebene WAF-/Gateway-Regeln, kontoübergreifende Missbrauchserkennung, datensparsame Logs, Alarme, Stoppschwellen, Betriebsbereitschaft | #272; G0-Schutzkonzept vor G1, operative Prüfung erneut vor G3 | **NO-GO** |
| 6 | P1 [#273 Parallelität/Integrität](https://github.com/duhrrom11/Helferlein/issues/273) | G2 | Entwicklung, DBA | Eigentümer-vor-Einladung-Sperrfolge, FK/Unique-Regeln vorgesehen | Separat genehmigter isolierter Parallelitäts-/Deadlock-/FK-/Löschpfad-Abnahmebericht, dokumentierte Fehlerbehebung | #270–#272; G1 erst nach separater Freigabe | **NO-GO** |
| 7 | P1 [#276 Auth/Tokens/Quoten](https://github.com/duhrrom11/Helferlein/issues/276) | G2 | Security, Entwicklung | `auth.getUser`, Empfängerbindung, Token-Hash, 2/5- und 3/10-Quoten, neutrale Fehler im Code | Separat genehmigtes isoliertes Sicherheits-/Funktionsprotokoll für JWT, Token, Widerruf, Quoten, HTTP-Fehler und Nichtoffenlegung | #271–#272; G1 erst nach separater Freigabe | **NO-GO** |
| 8 | P2 [#277 Formale Freigabe](https://github.com/duhrrom11/Helferlein/issues/277) | G3 / finale GO-Entscheidung | Produkt, DBA, Security, Entwicklung, SRE, Datenschutz | Rollenmodell, G0–G3, serverseitige Flags und Rollbackkonzept dokumentiert | Namentliche Zuständigkeiten, unabhängige datierte Unterschriften, fixierter geprüfter Release-Commit, Wartungs-/Rollbackfenster, ausdrückliche GO-Entscheidung | Alle #270–#276, G0–G2 und inaktive G3-Bereitstellung/Prüfung; finale Aktivierung folgt erst auf schriftliches GO | **NO-GO** |

**Leseregel:** Reihenfolge 1–8 ist die empfohlene Bearbeitungspriorität, keine Erlaubnis, spätere Gates vorzeitig auszuführen. #274 und #275 können dokumentarisch parallel vorbereitet werden; #273 und #276 dürfen erst nach separat genehmigter sicherer Umgebung technisch abgenommen werden. #277 kann organisatorisch vorbereitet, aber nicht abgeschlossen werden, solange Vorgänger offen sind.

## Verbindliche Freigabesequenz für später

1. **Vorbereitung G0:** Personen für alle sechs Rollen bestätigen; exakten Code-Release-Commit für die technische Prüfung fixieren; #270–#272 nachweisbar abnehmen; Backup-/PITR- und WAF-/Monitoring-Voraussetzungen aus #275/#274 vor Eingriffen freigeben. Bei Schema-/Rechteabweichungen **STOP**.
2. **Separates Change-GO für G1:** Erst nach schriftlicher DBA-/Security-/SRE-Freigabe und gesichertem Vorherzustand dürfen autorisierte Betreiber die drei Migrationen in Reihenfolge 70000 → 70001 → 70002 ausführen. Nach jeder Migration Ist-Zustand und Berechtigungen read-only nachweisen. **Dieser Schritt wurde hier nicht ausgeführt.**
3. **G2 in gesondert freigegebener isolierter Umgebung:** #273 und #276 einschließlich SQL-/Deno-Kompatibilität, Sperrverhalten, Fehlerpfaden und Datenschutz prüfen. Nachweise datiert mit Release-Commit und verantwortlicher Person hinterlegen. **Hier keine Tests.**
4. **G3 zunächst inaktiv:** Erst nach G1/G2 und gesonderter Freigabe Edge Functions mit `verify_jwt=true` bereitstellen, `HEIR_INVITATIONS_ENABLED` und `HEIR_REDEMPTION_ENABLED` ausgeschaltet lassen, `BACKEND_APPROVED=false` beibehalten. Sicherheits-/Monitoring-/Stoppschalter erneut bestätigen. **Hier kein Deployment.**
5. **Finales Aktivierungs-GO nur schriftlich:** Produkt, Security und SRE genehmigen ein konkretes Aktivierungsfenster und Rollbackbereitschaft; DBA, Entwicklung und Datenschutz liefern ihre dokumentierten Fachfreigaben. Für #277 müssen G0–G2 und die Prüfung der **inaktiven** G3-Bereitstellung belegt sein. Das schriftliche Aktivierungs-GO erfolgt **vor** der Aktivierung; die nachgelagerte Überwachung/Abschlussdokumentation erfolgt **danach**. #277 darf erst nach vollständigem Freigabenachweis abgeschlossen werden, ohne dass ein Issue-Abschluss selbst die Aktivierung auslöst. **Hier keine Aktivierung.**

## Konsistenzprüfung und Gate-Trennung (2026-11-12)

- **G0 versus G3:** #274 hat zwei Teilabnahmen: WAF-/Abuse-/Monitoring-Konzept und Verantwortlichkeiten **vor G1**; wirksame Konfiguration und Betriebsbereitschaft erneut **vor Aktivierung in G3**. Die spätere G3-Prüfung ersetzt die G0-Freigabe nicht.
- **G0 versus G2:** #275 verlangt bereits vor G1 einen belastbaren Backup-/PITR-/RPO-/RTO- und Notfallplan. Ein isolierter Restore-/Wartungsnachweis kann im gesondert genehmigten G2-Abnahmeprozess erbracht werden; ohne vorab bestätigte Wiederherstellbarkeit kein G1.
- **G0/G1 versus G2:** #271 enthält eine Vorprüfung bestehender Rechte **vor G1** und eine erneute Ist-Prüfung der neu angelegten Funktionen **nach G1**. #272 braucht vor G1 eine freigegebene Parser-/Compilerprüfung und nach G1/G2 die bestätigte Laufzeit-/RPC-Kompatibilität. Beide Issues bleiben bis zu allen zugeordneten Teilnachweisen offen; G1 darf nur aufgrund ausdrücklich dokumentierter Vorab-Gate-Freigaben erfolgen, nicht wegen eines voreilig geschlossenen Issues.
- **G3 und #277:** Inaktive Bereitstellung/Prüfung → schriftliches Aktivierungs-GO → gesondert autorisierte Aktivierung → Überwachung und Abschluss. Eine Anforderung, alle G3-Nachweise **einschließlich Aktivierung** vor dem Aktivierungs-GO zu erbringen, wäre zirkulär; die finale Betriebsabnahme wird zeitlich getrennt dokumentiert.
- **Release-Commit:** Dokumentations-Commits und beweglicher Branch sind keine Freigabe-Baseline. Die technische Abnahme muss auf einen fixierten Code-SHA verweisen; nach Änderungen sind betroffene Nachweise erneut zu bewerten.
- **Verantwortung:** #277 nennt Produkt/Security/SRE als finale Entscheidungsrollen; DBA, Entwicklung und Datenschutz sind trotzdem verpflichtende fachliche Zulieferer mit datierten Freigaben. Keine Rolle ist bisher namentlich bestätigt.
- **Metadatengrenze:** Nicht registrierte Erben-Migrationen und eine leere Edge-Function-Liste beweisen keine vollständige Abwesenheit manuell angelegter Objekte oder alternativer Endpunkte. Es gibt keine produktive Laufzeitabnahme.

## Mindestanforderungen an jeden Abnahmenachweis

- Datum, namentliche prüfende und freigebende Person, zugehörige Rolle, Git-Commit bzw. Migrationsversion und Umgebung.
- Reproduzierbare Methode, konkreter Ist-/Soll-Befund, Abweichungen, Korrekturverweise und unabhängige Bestätigung.
- Verlinktes Protokoll ohne Secrets, JWTs, Einladungstoken, Hashes oder personenbezogene Rohdaten.
- Explizite Entscheidung **GO** oder **NO-GO** für das jeweilige Gate; ein geschlossenes Issue oder gesunder Projektstatus allein reicht nicht.

## Aktueller STOP-Status

- **P0:** 3/3 offen; Schema-/Rechte-/Compiler-Abnahme fehlt.
- **P1:** 4/4 offen; Parallelität, Gateway, Backup und Sicherheitsabnahme fehlen.
- **P2:** 1/1 offen; Namen, Unterschriften, Release-Commit und Aktivierungsfenster fehlen.
- **Gesamt:** **NO-GO** für produktive Migration, Bereitstellung, Merge und Aktivierung. Die letzten lesenden Supabase-Metadaten meldeten keine registrierten Erben-Migrationen und keine Edge Functions. Keine Laufzeitprüfung wurde vorgenommen.

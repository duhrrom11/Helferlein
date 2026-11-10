# Helferlein 10 – Roadmap Nachlassverwaltung und Erben-Portal

**Stand:** 10. November 2026  
**Status:** Geplant / in Umsetzung; keine produktive Erbenfreigabe nachgewiesen  
**Geltungsbereich:** Ausschließlich Nachlassverwaltung (digitaler Tresor) und Erben-Portal  
**Arbeitsweise:** Möglichst große, abgeschlossene Umsetzungspakete auf GitHub `main`, mit gezielten Freigabeprüfungen statt zusätzlicher Kleinsttests.

> Diese Roadmap dokumentiert den Audit-Befund und die weitere Umsetzung. Sie ist keine Freigabe zur Umgehung von Sicherheitsprüfungen. Produktive Nutzerdaten dürfen nicht gelöscht oder als Testdaten verwendet werden.

## 1. Audit – bestätigter und offener Stand

- Das GitHub-Repository `duhrrom11/Helferlein` und der Zweig `main` sind erreichbar.
- Das aktive Supabase-Projekt `Helferlein` nutzt PostgreSQL 17.11; es handelt sich **nicht** um eine isolierte Testinstanz.
- In `public` existiert `vault_cloud_snapshots` mit aktivierter RLS; die Einladungs- und Vertrauenspersonen-Tabellen aus den Review-/Staging-Entwürfen wurden bei der letzten Bestandsaufnahme nicht als produktive Tabellen gefunden.
- Bei der letzten Prüfung waren keine Edge Functions im Supabase-Projekt deployed. Im Repository enthaltene `vault-api`- und Einladungspfade waren teilweise gesperrt/Platzhalter.
- Das vorhandene Erben-Portal enthält noch Firebase-bezogene Altlogik; die vollständige Supabase-Integration ist nicht nachgewiesen.
- Bestehende Offline-Sicherheitstests und SQL-Review-Entwürfe sind Vorarbeiten, aber **kein** Nachweis für echte RLS-/EXECUTE-Berechtigungen, Nebenläufigkeit oder sichere Schlüsselübergabe.
- Die projektweiten Supabase-Sicherheitswarnungen betreffen teilweise andere Module und werden nicht ohne gesonderten Auftrag umgebaut. Authentifizierungsrisiken, die den Nachlass betreffen, müssen jedoch bei der Freigabe berücksichtigt werden.

**Kritischer Architekturpunkt:** Nach einer berechtigten Freigabe muss ein Erbe genau die vorgesehenen verschlüsselten Inhalte entschlüsseln können, ohne dass Server, andere Nutzer oder widerrufene Berechtigte unbeabsichtigt Zugriff erhalten. Statusfelder allein lösen die Schlüsselübergabe nicht.

## 2. Priorisierte Restarbeiten

| Prio | Arbeit | Abschlusskriterium |
| --- | --- | --- |
| P0 | Rollen-, Identitäts- und Schlüsselzugriffsmodell | Eigentümer, Vertrauenspersonen, Erben, Freigabebedingungen und Kryptografie sind eindeutig spezifiziert |
| P0 | Cloud-Tresor absichern und anbinden | Bestandsdaten bleiben erhalten; APIs und Zugriffskontrollen sind konsistent |
| P0 | Einladung, Annahme, Widerruf, Eigentümerwechsel | Servergeprüfte Identität, atomare Zustandswechsel und fail-closed Verhalten |
| P0 | Erben-Portal integrieren | Kein ungesicherter Firebase-Altpfad, ein nachvollziehbarer berechtigter Zugriffspfad |
| P0 | Alarm-/Karenz-/Freigabelogik | Serverseitig durchgesetzt, widerrufbar, prüfbar und ohne vorzeitige Offenlegung |
| P1 | Wiederherstellung und Gerätewechsel | Schlüssel- und Datenverlustszenarien definiert und abgesichert |
| P1 | Audit-Ereignisse, Missbrauchsschutz, Monitoring, Rollback | Betriebs- und Notfallabläufe funktionieren |
| P1 | Echte Integrations- und End-to-End-Freigabeprüfung | Berechtigungen, Race Conditions, Schlüsselübergabe und Nutzerablauf nachgewiesen |
| P2 | Komfort, Formulierungen, kosmetische UI-Verbesserungen | Nach sicherer Kernfreigabe priorisieren |

## 3. Umsetzungspakete

### Paket A – Sicherheitsarchitektur und Ist-Bestand (gebündelt mit Vorarbeiten B/C)

1. Repository-Pfade, Datenmodelle, aktive Supabase-Schemas/Migrationen, APIs, Verschlüsselung und Erben-UI in **einem** Durchgang erfassen.
2. Tatsächliche Datenflüsse, Rollen, Identitätsquelle, Schlüsselhaltung, Widerrufssemantik, Alarmzustände und Eigentümerwechsel verbindlich entscheiden und dokumentieren.
3. Review-only-SQL von tatsächlich deploybaren Migrationen trennen; keine ungetesteten Entwürfe aktivieren.
4. Anforderungen und Akzeptanzkriterien für Backend und UI gemeinsam festlegen.

**Fertig, wenn:** Ein zusammenhängender, implementierbarer Sicherheits- und Schnittstellenvertrag existiert; bekannte Blocker sind sichtbar.

### Paket B – Vollständiges Backend (ein großer Implementierungsdurchgang)

1. Datenbankschema, Constraints, RLS, Rechte, Indexe und Migrationen für den Nachlassbereich konsistent aufbauen.
2. Sichere serverseitige Authentifizierung und interne Ausführung: keine aus dem Browser frei vorgebbare Nutzer-ID; kein unkontrolliertes `SECURITY DEFINER`/`EXECUTE`.
3. Einladungen, Annahme, Widerruf, Eigentümerwechsel und Sperrreihenfolge atomar implementieren.
4. Alarmzustände, Karenzzeiten, Berechtigungsfreigabe, geschützte Schlüsselübergabe und Audit-Ereignisse integrieren.
5. Rückwärtskompatibilität und Datenerhalt kontrollieren; Rollback planen.

**Fertig, wenn:** Die Backend-Flows durchgängig implementiert und in einer **nicht produktiven** Umgebung für die Freigabeprüfung bereit sind.

### Paket C – Nachlassverwaltung und Erben-Portal (möglichst mit B gebündelt)

1. Besitzer-Oberfläche für Tresor, Vertrauenspersonen, Einladungen, Widerrufe und Status integrieren.
2. Erben-Portal auf die verbindlichen Backend- und Schlüsselverträge umstellen; unsichere Altpfade beseitigen oder deaktiviert lassen.
3. Verständliche Zustände für noch nicht freigegeben, widerrufen, abgelaufen, berechtigt und abgeschlossen implementieren.
4. Gerätewechsel, Wiederherstellung und Fehlerzustände in den Gesamtfluss aufnehmen.

**Fertig, wenn:** Ein vollständiger, technisch durchgehender Nutzerablauf bereitsteht; noch nicht automatisch produktiv aktiviert.

### Paket D – Minimale notwendige Freigabeprüfung und Deployment

1. Eine **wirklich isolierte** PostgreSQL-17-Instanz bereitstellen; keine synthetischen Testdaten auf der produktiven Supabase-Datenbank.
2. Mindestens zwei unabhängige Sessions für konkurrierende Einladungseinlösung, Widerruf und Eigentümerwechsel prüfen.
3. Tatsächliche Rollen-/EXECUTE-/RLS-/Funktionsinhaberrechte prüfen, einschließlich Identitätsspoofing, falschem Erben und vorzeitiger Freigabe.
4. Verschlüsselung, Schlüsselübergabe, Recovery und End-to-End-Portalfluss gezielt testen.
5. Migrationen/Deployments erst nach bestandenem Sicherheits-Gate kontrolliert durchführen; Backup, Monitoring und Rollback bereitstellen; Aktivierung ausdrücklich als eigenen Schritt dokumentieren.

**Fertig, wenn:** Nachweisbare Freigabeergebnisse, Deploy-Status und funktionsfähiger Rückfallplan vorliegen.

### Paket E – Stabilisierung und Übergabe

1. Laufzeitfehler, Audit-Ereignisse und betriebliche Warnsignale prüfen.
2. Wesentliche Probleme priorisiert beheben, veraltete Entwürfe kennzeichnen.
3. Technische und Nutzer-Dokumentation konsolidieren.
4. Abschließende Betriebs- und Sicherheitsübergabe dokumentieren.

**Fertig, wenn:** Das System wartbar und betriebsfähig ist und verbleibende Risiken transparent sind.

## 4. Teststrategie: notwendige Tests statt Testserien

**Nur diese risikoorientierten Freigaben sind zwingend:**
- **Autorisierung:** falsche Identität, fremder Tresor, widerrufene Einladung, bereits akzeptierter oder abgelaufener Token.
- **Nebenläufigkeit:** parallele Einlösung, Widerruf und Eigentümerwechsel mit mindestens zwei echten Datenbanksessions.
- **Kryptografie:** keine unbeabsichtigte Klartextfreigabe; berechtigte Schlüsselübergabe und Wiederherstellung.
- **Datenintegrität:** keine zerstörte Bestandsinformation, keine stillschweigende Reaktivierung.
- **End-to-End:** ein vollständiger Besitzer-zu-Erben-Ablauf.

Keine zusätzlichen Regex-/Mutations-Tests ohne konkrete bisher ungesicherte Schutzbedingung. Bereits vorhandene geeignete Tests wiederverwenden.

## 5. Autopilot-Regeln

- **Geltungsbereich strikt begrenzen** auf Nachlassverwaltung und Erben-Portal.
- **`main` bevorzugen**; Änderungen möglichst als zusammenhängende, überprüfte Implementierungspakete committen, nicht als Kleinst-Commits.
- GitHub-Arbeiten, erforderliche Merges, Supabase-Änderungen und Deployments im Rahmen der Nutzerfreigabe eigenständig durchführen.
- **Produktive Daten schützen:** keine Löschungen, keine synthetischen Daten im Live-System, keine unkontrollierten Rechtefreigaben.
- **Sicherheits-Gate beibehalten:** Kritische Berechtigungs-, Verschlüsselungs- und Freigabeänderungen erst nach erfolgreicher Prüfung aktivieren.
- Ein Abschlussbericht **pro Paket** mit Änderungen, Tests, Grenzen, Deploy-Status, offenen Blockern und echten Commit-SHAs.
- Vor jeder Ausführung den tatsächlichen aktuellen `main`- und Supabase-Stand erneut abgleichen; die hier dokumentierten Befunde sind eine Momentaufnahme.

## 6. Nächster gebündelter Arbeitsauftrag

**Paket A unmittelbar beginnen und die umsetzbaren Teile von B und C möglichst im selben Durchgang erledigen.** Erst die vollständige Daten-, Rechte- und Schlüsselarchitektur gegen den realen Projektbestand abgleichen, dann Backend und Portal integriert implementieren. Anschließend das sicherheitskritische Freigabe-Gate aus Paket D abarbeiten. Keine weitere Testserie als Selbstzweck.

**Aktueller Roadmap-Status:** A offen; B/C vorbereitet, nicht fertig; D blockiert bis isolierte Integrationsumgebung und sichere Implementierung vorliegen; E nach erfolgreicher Freigabe.

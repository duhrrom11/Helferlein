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

## 7. Umsetzungsstand – Eigentümer-Metadaten-API (10. November 2026)

- **Bestandsabgleich:** Die produktive Datenbank enthält `public.vault_cloud_snapshots`, aber keine Tabelle `public.vault_ownership`. Die frühere `vault-api` referenzierte damit eine nicht vorhandene Tabelle.
- **Rechte geprüft (nur lesend):** `vault_cloud_snapshots` hat RLS aktiviert; eine SELECT-Policy bindet `owner_user_id` an `auth.uid()`. `authenticated` hat SELECT, `anon` nicht; `FORCE ROW LEVEL SECURITY` ist nicht aktiviert.
- **Backend-Code:** `supabase/functions/vault-api/index.ts` verwendet nun ein mit dem geprüften Benutzer-JWT konfiguriertes Supabase-Clientobjekt und liest ausschließlich `vault_id`, `owner_user_id` und `updated_at` aus `vault_cloud_snapshots`. Es gibt nur Metadaten für den nachweislich passenden Eigentümer zurück; keine verschlüsselten Inhalte, Schlüssel oder Erbenfreigaben. `service_role` wird nicht verwendet.
- **Gezielte Offline-Prüfung:** Fünf Node.js-Handler-Tests bestanden (Eigentümer, ungültige Tokens, Fremdzugriff, Datenbankfehler, ungültige Tresor-ID). Getestet mit Mock-Clients; **keine reale JWT-/RLS-End-to-End-Prüfung**.
- **Commits:** API `d23a140489af9979c0212be3c9e67a802a11a496`; Tests `eec7e76ec187755560867ec2b554382e7b91bea0`.
- **Deployment:** In diesem Arbeitsschritt **nicht deployed** und **nicht aktiviert**. Kein produktives Schema oder Nutzerdatum geändert.

**Nächste gebündelte Etappe:** Schlüssel- und Freigabeprotokoll sowie Besitzer-/Erben-Datenflüsse verbindlich abschließen; bestehende Alt-Firebase-Lesepfade vor aktivierter Erbenfreigabe ersetzen oder sicher sperren; anschließend Backend und UI integriert vervollständigen. Eine produktive Erbenfreigabe bleibt bis zum Sicherheits-Gate von Paket D aus.

## 8. Erben-Portal im fail-closed Übergangsbetrieb (10. November 2026)

**GitHub-Befund:** Das bisherige Erben-Portal las Ciphertext direkt aus Firebase und erlaubte eine Freigabe nach ausschließlich browserseitig berechneten Zeitbedingungen. Ältere URLs konnten Master-Keys transportieren. Eine nachträgliche UI-Frist kann bereits verteilte Schlüssel nicht zurückholen.

**Umsetzung auf main:** Der Portal-Einstieg `tools/digitaler-nachlass/erben.html` wurde auf eine eigenständige gesperrte Statusseite ohne Firebase, Netzwerkabfragen, Alarm, Schlüsselannahme und Entschlüsselung umgestellt. URL-Query und Fragment werden sofort per History-API entfernt; bereits erfolgte Übertragung von Query-Parametern an Webserver und alte Links bleiben ein Restrisiko.

**Sicherheitsvertrag:** `docs/NACHLASS_ERBEN_SICHERHEITSVERTRAG.md` spezifiziert serverseitige Identitäts-/Freigabeprüfung, personengebundene Schlüsselhüllen, Zustandsübergänge, Widerruf und notwendige echte PG17-Nebenläufigkeitstests. Er ist **noch keine Implementierung**.

**Gezielte Tests:** Drei offline ausgeführte Node.js-Prüfungen bestanden: keine Alt-Firebase-/Netzwerkpfade im neuen Portal, Query-/Fragment-Bereinigung unter simulierten URL-Zuständen sowie Prüfung der frühen Ausführung. Keine echte Browser-/Hosting- oder Ende-zu-Ende-Integration geprüft.

**Commits:** Portal `33e4944293ae8953470af17817596db5fd52cc76`; Tests `bc2950caed3df1a7dadac62b03172202adc86a90`; Sicherheitsvertrag `356b16925961320029a88c9fe83576e1c15d9b24`.

**Verbleibende P0-Blocker:** Besitzeroberfläche mit Firebase-/Master-Key-Link-Erzeugung, sichere Bestandsdatenmigration, reale serverseitige atomare Einladung/Widerruf, Schlüsselhüllen und der gesamte Freigabe-Gate. Kein Supabase-Deployment oder Datenbankschema-Eingriff in dieser Runde. GitHub-main-Datei ist geändert; der tatsächliche GitHub-Pages-Veröffentlichungszustand wurde nicht bestätigt.

## 9. Besitzeroberfläche: Schlüssel-Link-Ausgabe gesperrt / Datenflüsse inventarisiert (10. November 2026)

**Audit:** Im Besitzer-Frontend wurden vier Stellen mit potentieller Ausgabe von `#key=` gefunden (Kopieren/Versand, QR-Vorschau, PDF-Erzeugung, zugehörige Linkvalidierung). Der vollständige lokale Tresorschlüssel war damit trotz eines gesperrten Erben-Portals weiterhin als Notfall-Link teilbar. Firestore synchronisiert weiterhin verschlüsselte Tresor-Inhalte mit **unverschlüsselten** Kontakt-/Check-in-Metadaten; die Supabase-Tabelle enthält separat verschlüsselte Owner-Backups. Diese Alt-Datenflüsse wurden nicht gelöscht.

**Änderung auf `main`:** Die Besitzeroberfläche erstellt keine Master-Key-Erben-URLs mehr, kopiert/versendet diese nicht und erzeugt keine Schlüssel-QRs oder -PDFs. Kontaktverwaltung und lokale Tresorverschlüsselung bleiben bestehen. Die nicht mehr benötigten PDF-/QR-/E-Mail-Bibliotheken wurden aus der Seite entfernt. Notfall-Kit und Schlüsselversand erscheinen ausdrücklich als gesperrt. Die Legacy-Firebase-Synchronisierung existiert weiterhin (ohne Erbenfreigabe); die Besitzeroberfläche ist deshalb noch **nicht vollständig migriert**.

**Bestandskompatibles Backend-Design:** `docs/NACHLASS_ERBEN_IMPLEMENTIERUNGSPLAN.md` dokumentiert Datenflüsse, genaue Endpunktverträge, benötigte private Tabellen, serverseitige JWT-Bindung, Lock-Reihenfolge, Verschlüsselungs-Hüllen, Widerruf, Freigabe-Gates und Migrationsrisiken. Beachten: Primärschlüssel der bestehenden `vault_cloud_snapshots` ist `owner_user_id`, `vault_id` hat bislang keine nachgewiesene UNIQUE-Constraint; alte `vault_ownership`-Drafts nicht unverändert verwenden.

**Prüfung:** Der originale GitHub-Blob wurde vor Änderungen abgerufen. Nach der Änderung wurden elf gezielte Schutzbedingungen gegen den tatsächlichen HTML-Stand geprüft (kein Key-Link/Clipboard/E-Mail/QR/PDF-Code; lokale Kryptografie und Recovery erhalten); das gesamte Inline-JavaScript bestand eine Syntaxkompilierung. Nach Entfernen ungenutzter Bibliotheken erneut vollständige Inline-Syntaxprüfung. **Keine End-to-End-/Browser-/Supabase-Migrationstests.**

**Commits:** Hardening `c05fb355749b6e39f2823c116097bca8b935e048`, ungenutzte Bibliotheken `45d052c1d71e2fc9ca32060c9612233735c73fc8`, Implementierungsplan `211378b9d9e4ef1aa9175a525142b6ba410fb6dc`.

**Nächster Blocker:** Aktive serverseitige Einladung/Widerruf/Schlüsselhüllen erfordern die isolierte PG17-Nebenläufigkeitsprüfung und eine geprüfte Endgeräte-Kryptografie. Die Erben-Freigabe ist nicht aktiv. Alte, bereits geteilte Geheimschlüssel können nicht rückwirkend gesperrt werden.

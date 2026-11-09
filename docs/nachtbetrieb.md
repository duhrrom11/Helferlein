# Helferlein – automatisierter Nachtbetrieb

## Status

Der GitHub-Actions-Workflow `.github/workflows/night-coordinator.yml` und das Skript `scripts/night-coordinator.cjs` sind im Hauptzweig eingerichtet. **Dies ist ein rund um die Uhr laufender, lesender Prüf- und Dokumentationsbetrieb, kein autonomer Coding-Agent.** Geplante Läufe wurden bereits protokolliert; GitHub kann einzelne Termine dennoch auslassen.

## Zeitplan und Zeitzone

- GitHub Actions plant `*/5 * * * *` in UTC.
- Die Repository-Prüfungen laufen rund um die Uhr; `Europe/Berlin` dient zur Tageszuordnung und für den Morgenbericht.
- Um 06:00 Uhr Ortszeit wird ein Morgenbericht in einem GitHub-Issue erstellt. Eine kurze Kulanzzeit bis 06:29 Uhr erlaubt verzögerte GitHub-Schedule-Starts; der Bericht wird je Kalendertag höchstens einmal veröffentlicht.
- GitHub garantiert **keine sekundengenaue Ausführung** und kann geplante Läufe verzögern oder auslassen. Auch 288 erfolgreiche Prüfungen pro Tag sind nicht garantiert.
- `workflow_dispatch` erlaubt einen manuellen Durchlauf. Manuelle Aufrufe führen ebenfalls einen Prüf-Schritt aus, keinen produktiven Eingriff.

## Dauerhafter Zustand und Chat-Wechsel

Das Skript erstellt bei Bedarf ein öffentliches GitHub-Issue **„Helferlein Nachtbetrieb – dauerhafter Arbeitsstand“** und speichert darin JSON mit der nächsten Prüfroutine, den letzten 100 Ergebnissen und dem letzten Berichtstag. Jeder Lauf liest den aktuellen Zustand. Das ermöglicht die Fortsetzung unabhängig vom Chatverlauf.

**Wichtig:** Der vollständige Inhalt privater Chat-Unterhaltungen wird weder kopiert noch automatisch in einen neuen Chat übertragen. Ausschließlich bewusst dokumentierte, nicht vertrauliche Projektinformationen werden übernommen. Keine Zugangsdaten, persönlichen Nutzerdaten oder Tresorinhalte in Issues oder Actions-Logs schreiben.

## Derzeitige Arbeitsroutinen

1. SQL-Migrationsdateien inventarisieren.
2. `scripts/release-smoke.cjs` ausführen.
3. Prüfen, ob die Tresor-API weiterhin ausdrücklich gesperrt ist.
4. Schutzmarker der WG-Anmeldung und -Speicherung prüfen.
5. RLS-Migrationsdatei auf Vorhandensein prüfen.
6. Offene Freigabekriterien aus `docs/supabase-produktivabnahme.md` zählen.

Die Routinen wechseln sich ab. Diese Prüfungen ersetzen **keine** Browser-, Authentifizierungs-, Berechtigungs- oder Wiederherstellungstests. Sie liefern keine eigenständige Live-Freigabe.

## Coding-Agent und Freigabegrenzen

Für tatsächliche Entwicklungsarbeiten ist ein separater Agent-Job mit eigener, eng begrenzter Berechtigung erforderlich. Der bestehende OpenAI-Draft-PR-Pilot erstellt bisher lediglich Vorschlagsdokumente und ist manuell startbar:

1. **Auftrag:** Ein Agent liest die offene, versionierte Aufgabenliste und wählt eine kleine, klar definierte Änderung.
2. **Isolierung:** Agent erhält nur Repository-Lesezugriff und Schreibrechte auf einen separaten Arbeitsbranch; niemals produktive Supabase-Schlüssel, Service-Role-Secrets oder Rechte für direkte Deployments.
3. **Änderung:** Agent erstellt einen Pull Request, niemals einen direkten Commit auf `main`.
4. **Prüfung:** Automatische Syntax-, Security- und Release-Prüfungen müssen erfolgreich sein.
5. **Freigabe:** Änderungen an Auth, RLS, Migrationen, Tresoren, Benutzerrechten, Workflows und Deployments erfordern ausdrücklich menschliche Prüfung und Zustimmung. **Kein automatisches Merge** in den Produktivzweig.
6. **Übergabe:** Pull-Request-Link, Ergebnis, offene Fragen und nächster Schritt werden dauerhaft dokumentiert.
7. **Fehler:** Bei fehlenden Berechtigungen, fehlgeschlagenen Prüfungen oder unklarer Datenlage wird gestoppt statt geraten.

Zur Aktivierung dieses Agent-Jobs müssen später Agent-Laufzeit, zulässiges Modell, Kostenbudget, Zugangsdaten, GitHub-Berechtigungen und Freigaberegeln eingerichtet werden. Der jetzige Nachtkoordinator benötigt dafür keine zusätzlichen Geheimnisse.

## Einmalige Inbetriebnahme und Kontrolle

1. In GitHub unter **Actions** den Workflow „Helferlein Nachtbetrieb“ aufrufen und einmal manuell starten.
2. Prüfen, ob der Lauf erfolgreich abgeschlossen wird und das Status-Issue angelegt beziehungsweise aktualisiert wurde.
3. Prüfen, ob die Repository-Einstellung GitHub Actions und Issue-Schreibzugriffe für `GITHUB_TOKEN` zulässt.
4. Nach der ersten Nacht kontrollieren, ob die Prüfungen und der Morgenbericht tatsächlich eingetragen wurden.
5. Erst nach erfolgreicher Prüfung den Coding-Agent separat freigeben.

## Grenzen

- Keine automatischen Änderungen an Supabase-Produktivdaten.
- Keine Testdaten in der produktiven Datenbank.
- Keine automatische Tresor-Migration oder Tresor-Freigabe.
- Keine Zusicherung, dass GitHub einen neuen Chat öffnet oder private Chat-Inhalte vollständig übernimmt.
- Keine automatische Aktivierung oder Freigabe eines Coding-Agenten.

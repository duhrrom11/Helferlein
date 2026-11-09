# Freigabe- und Funktionstestplan

Status: **Nicht freigegeben**. Der Code liegt im Draft-PR; die folgenden End-to-End-Tests sind noch nicht als erfolgreich nachgewiesen.

## Automatische Tests
- `node --check amazon-wishlist/app.mjs`
- `node --test amazon-wishlist/*.test.mjs`
- GitHub Actions: Workflow `.github/workflows/amazon-wishlist.yml`; erfolgreichen Lauf **für den jeweiligen neuesten Commit** vor Merge prüfen.
- Nach erfolgreicher Anmeldung, Registrierung und Abmeldung prüfen, dass das Passwortfeld geleert wird; auch nach Auth-Statuswechsel ohne Sitzung.

## Manuelle Browserprüfung (mit eigenen echten Konten, ohne Testdaten in der Produktivdatenbank)
1. Anonyme Startseite öffnen: Login sichtbar, Feed lesbar, keine Bearbeitungsaktionen.
2. Bestehendes Konto anmelden; Profil erstellen, aktualisieren und nach Abmeldung keine Bearbeitungsaktionen sehen.
3. Gültigen Amazon.de-Link und selbst eingegebenen Titel speichern. Doppelte ASIN im eigenen Profil darf keinen zweiten Wunsch erzeugen.
4. Wunsch aus eigenem Konto entfernen; nach Reload muss er fehlen.
5. Fremde Wünsche dürfen nicht bearbeitet oder gelöscht werden; dies auch direkt gegen die API prüfen.
6. Ungültige URLs, fremde Domains, fehlerhafte ASINs und leere Titel müssen abgewiesen werden.
7. Affiliate-Link muss `https://www.amazon.de/dp/ASIN?tag=duhrrom-21` verwenden.
8. Mobile Ansicht, Tastaturbedienung, Fehleranzeigen, Pagination und langsame Netzwerke prüfen.
10. Öffentliche Profilansicht über `?profile=handle` öffnen, Profil aus Suche auswählen, Profil-Link kopieren und fremde Wünsche korrekt anzeigen. Profilwechsel und Feed-Filter auf allen Seiten prüfen.
11. Wunschbearbeitung: Notiz/Priorität ändern, Titel/ASIN unverändert lassen, Bearbeitung abbrechen und gerade bearbeiteten Wunsch löschen.
9. Supabase Auth: E-Mail-Bestätigung, erlaubte Redirect-URLs, Missbrauchsschutz und Rate Limits prüfen.

## Offene Produktanforderungen vor öffentlichem Launch
- Impressum, Datenschutzerklärung, Amazon-Partnerprogramm-Hinweis und Community-Moderation.
- Schutz gegen automatisierte Masseneinträge; RLS verhindert fremde Schreibzugriffe, ersetzt aber kein Rate Limiting.
- Produktmetadaten nur aus erlaubter Quelle; aktuell manuelle Titel ohne Preise oder Bilder.
- Veröffentlichung nur nach Review und bestätigtem CI-/Browser-Test; kein automatischer Merge.

## Übergabe für weitere Entwicklungsläufe
- Feature-Branch: `feature/amazon-wishlist-foundation`; PR #166 bleibt Draft. Aktuelle Änderungen über GitHub-Commit-Historie prüfen, nicht nur über Chatverläufe.
- Neu: Öffentliche Profil-Wunschansicht mit `?profile=<handle>`, Suchergebnis-Aktion »Wünsche ansehen«, Profil-Link kopieren; nur bestehende RLS-lesbare Daten.
- Wichtig: GitHub Actions `Amazon wishlist checks`, `Browser launch smoke` und weitere Workflows nach jedem Commit auf Abschluss und Erfolg prüfen; ein laufender Workflow ist kein bestandener Test.
- Vor Launch zusätzlich Profile-Link-Fehlerfälle, Browser- und RLS-Tests prüfen. Keine Testdatensätze in Produktiv-Supabase erstellen.

## CI-Befund vom 09.11.2026 (03 Uhr MEZ)
- Für Commit `f2257eb36ede3c905e35d57a71d0d93f1b7ec04a` ist `Amazon wishlist checks` (Run `42543252404`) **erfolgreich** abgeschlossen. Ebenso `Browser launch smoke` (Run `42543252531`), `Release smoke checks` und `Production route smoke`.
- **Separater Blocker:** `B3 Startseite` (Run `42543252421`) ist fehlgeschlagen: In `tests/b3-startseite.spec.cjs:59` findet Playwright den erwarteten sichtbaren Button mit Namen `Backup` im Einstellungsdialog nicht. 8 von 9 Tests bestanden. Diesen Root-UI-Test vor Merge prüfen, unabhängig von den Wishlist-Tests.
- Für den Passwortfeld-Commit `9138fc67de60dfa6ac0b7d36a7ae9f22023bbece` wurden inzwischen sechs **laufende** Workflow-Runs gefunden (darunter `Amazon wishlist checks`, Run `42548925187`). Ihre Ergebnisse sowie die Checks des nachfolgenden Dokumentations-Commits müssen vor Merge erneut geprüft werden.

## B3-Startseite-Testkorrektur (09.11.2026)
- Der bisherige Test erwartete einen Button mit zugänglichem Namen `Backup`. Die tatsächliche Oberfläche verwendet stattdessen die Buttons `🔐 Verschlüsselt` und `📥 Ohne Schutz` sowie einen Datei-Import `📤 Restore`. Der Test wurde an diese vorhandenen Bedienelemente angepasst und prüft explizit beide Exportvarianten und das Importfeld. Keine Änderung an der Backup-Logik oder den Nutzerdaten.
- Für Dokumentations-Commit `47ed4e3` waren fünf Workflows erfolgreich (`Amazon wishlist checks`, `Backup security policy`, `Release smoke checks`, `Production route smoke`, `Browser launch smoke`); `B3 Startseite` blieb fehlgeschlagen (Run `42548957715`).
- Testkorrektur-Commit `52ebdfa`: Workflow-Ergebnisse zum Zeitpunkt dieser Prüfung noch nicht verfügbar. **Vor Merge erfolgreichen B3- und Wishlist-CI-Lauf für den aktuellen Head nachweisen.**

## CI-Nachprüfung und Korrektur (09.11.2026, 05 Uhr MEZ)
- Head `89cbf7723bb1d446a8acad0d4c2c9933f053138a`: fünf Workflows erfolgreich (`Amazon wishlist checks`, `Browser launch smoke`, `Production route smoke`, `Release smoke checks`, `Backup security policy`). `B3 Startseite` Run `42553697176` fehlgeschlagen: 8/9 Playwright-Tests bestanden.
- GitHub-Job-Log zeigt den konkreten verbliebenen Fehler in `tests/b3-startseite.spec.cjs:65`: Die Testassertion erwartete den veralteten Satz `Backup-Dateien sind nicht verschlüsselt`, während die UI tatsächlich `Die einfache Backup-Datei ist unverschlüsselt und darf nicht geteilt werden.` anzeigt. Die Warnung ist vorhanden; nur der Testtext war veraltet.
- Testassertion im Commit `59560cb3d2d3fd2e2d75a531e1ef8b097730cd8d` auf die tatsächliche Sicherheitswarnung aktualisiert. Noch kein bestandener CI-Nachweis für diesen neuen Commit; vor Merge aktuellen B3-Workflow und Wishlist-Workflow erneut prüfen.

## Prüfung vom 09.11.2026 (06 Uhr MEZ)
- Für den vorherigen Head `e180503fb3c63071555ca257fd9254582bc5677b` sind alle sechs PR-Workflows erfolgreich abgeschlossen, einschließlich `B3 Startseite` (Run `42559510008`) und `Amazon wishlist checks` (Run `42559510053`). Der zuvor gemeldete B3-Blocker ist damit für diesen Commit behoben.
- In `app.mjs` wurde ein Fehler bei über `?url=` geteilten Amazon-Produktlinks korrigiert: `auth()` setzte beim anonymen Laden das Wunschformular zurück und löschte dadurch den zuvor eingetragenen Link. Nach dem Reset wird ausschließlich ein gültiger Amazon.de-Link aus dem URL-Parameter wiederhergestellt. Keine Datenbankänderung.
- Neuer Code-Commit `e2ae7dfc07b32d0a0ab80c3d2d53ecc13b1e8772`: CI für den neuesten Branch-Head erneut prüfen; zusätzlich den anonymen `?url=`-Einstieg im Browser testen, auch bei Auth-Statuswechsel.

## Prüfung vom 09.11.2026 (07 Uhr MEZ)
- Für den vorherigen Head `02eaa49cb101584439cc7ca3e9ea336fe91ab2bd` sind alle sechs PR-Workflows erfolgreich abgeschlossen, einschließlich `Amazon wishlist checks` (Run `42564977892`) und `B3 Startseite` (Run `42564978073`).
- Importierte `?url=`-Amazon.de-Produktlinks werden nun zu `https://www.amazon.de/dp/ASIN` kanonisiert; externe Affiliate-/Tracking-Parameter gelangen nicht mehr in das Formular. Auch beim anonymen Auth-Reset bleibt nur die kanonische URL erhalten. Die Parser-Validierung begrenzt weiterhin die Eingabe auf gültige Amazon.de-Produktlinks.
- Neuer Regressionstest deckt Tracking-Parameter, HTTP-Normalisierung, fremde Marktplätze, Lookalike-Domains und ungültige Links ab. **Für die neuen Commits ist CI noch separat nachzuweisen**; kein Browser-E2E-Nachweis und keine Änderung an der Produktivdatenbank.

## Prüfung vom 09.11.2026 (08 Uhr MEZ)
- Für den vorherigen Head `6093b2e035a0c2f645db2e2e0ca1ee51acc7f388` sind alle sechs PR-Workflows erfolgreich abgeschlossen, einschließlich `Amazon wishlist checks` und `B3 Startseite`.
- Öffentliche Profil-Deep-Links normalisieren jetzt Großbuchstaben (z. B. `?profile=Alice_123` zu `alice_123` für die Datenbankabfrage), entsprechend der vorhandenen Benutzername-Validierung. Ungültige Parameter werden weiterhin ignoriert. Regressionstest ergänzt.
- Neuer Head nach der Codeänderung: `51cae14282f124e6e13bc421789c7b0e9308add5`. Für diesen Stand CI separat prüfen; Browser-End-to-End-Prüfung für Deep-Links und RLS weiterhin offen. Keine Produktivdaten geändert.

## Prüfung vom 09.11.2026 (09 Uhr MEZ)
- Pagination-Fehler behoben: Der allgemeine Button-Wrapper aktivierte den Button »Mehr laden« nach jedem Klick erneut, selbst wenn der Feed keine weiteren Einträge hatte. Der dedizierte Handler lässt den von `feed()` ermittelten deaktivierten Zustand bestehen und aktiviert den Button nur nach einem Fehler wieder. Commit `9fd0081e238903330966a657d0140513f9b174f4`.
- Weiterhin offen: Browser-Test mit genau 20 und 21 Wünschen, mehrfacher Filterwechsel, Fehlerfall beim Nachladen sowie CI für den neuesten Commit. Keine Änderungen an produktiven Daten; kein Merge und kein Deployment.

## Nachprüfung vom 09.11.2026 (09:27 Uhr MEZ)
- Für Code-Commit `4f62a04b4bce0f67f676a5471521a1f28a06931c` sind sechs GitHub-Actions-Workflows **erfolgreich abgeschlossen**: `Amazon wishlist checks`, `Browser launch smoke`, `B3 Startseite`, `Backup security policy`, `Release smoke checks` und `Production route smoke`.
- Der Commit leert das Passwortfeld auch bei fehlgeschlagener Anmeldung/Registrierung durch `finally`. Automatische CI ist erfolgreich, aber der interaktive Fehlerpfad ist noch nicht separat als Browser-End-to-End-Test nachgewiesen.
- Live-Supabase-Sicherheitsprüfung: RLS ist für `wishlist_profiles`, `wishlist_products`, `wishlist_wishes`, `wishlist_follows` aktiv; anonyme Rollen besitzen ausschließlich `SELECT`, Eigentümerregeln sind für Schreibzugriffe vorhanden. Keine Daten oder Policies verändert. Auth-Sicherheitsadvisor meldet weiterhin deaktivierten Schutz vor kompromittierten Passwörtern; siehe https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- **Keine Freigabe:** Manuelle Browser-/RLS-Negativtests, Auth-Konfiguration, rechtliche Pflichtseiten und Abuse-Schutz bleiben offen. Deployment bleibt ausdrücklich verboten, Merge nur nach nachgewiesener Freigabereife.

## Prüfung vom 09.11.2026 (10 Uhr MEZ)
- Für den vorherigen Dokumentations-Head `7a4bb2a118438f46d98b1feff90317a7bd6880a5` sind alle sechs PR-Workflows erfolgreich abgeschlossen, einschließlich `Amazon wishlist checks` und `B3 Startseite`.
- Feed-Pagination holt jetzt 21 statt 20 Datensätze je Anfrage und zeigt maximal 20 an. Das zusätzliche Lookahead-Element bestimmt, ob »Mehr laden« tatsächlich sinnvoll ist; bei exakt 20 Einträgen bleibt der Button deaktiviert, statt eine leere Folgeseite anzufordern. Die 21. Zeile wird bei der nächsten Anfrage wieder ab Offset 20 gelesen, also nicht übersprungen.
- Reiner Helper `feedPage` und Regressionstests für 0, 1, 19, 20, 21 und 40 Ergebnisse ergänzt. Code-Commits `7a1981f`, `c461ee2`, `9f399e1`. CI für den neuen Code-Head ist noch nicht bestätigt; Browser-/RLS-E2E-Prüfungen weiterhin offen. Keine Supabase-Änderung, kein Merge, kein Deployment.

## Profil-Suchrennen (09.11.2026, 11 Uhr MEZ)
- Code-Commit `b03829af4a1294a50d55e94db5f18009a489b1f2`: Die asynchrone Profilsuche verwirft Ergebnisse einer älteren Anfrage, sobald eine neuere Suche gestartet wurde. Nach dem Laden der Abonnements wird erneut geprüft; auch ein zwischenzeitlicher Wechsel des angemeldeten Kontos verhindert die Anzeige veralteter Ergebnisse.
- Browser-Regression offen: Zwei Suchanfragen mit absichtlich vertauschter Antwortreihenfolge auslösen; nur das neuere Ergebnis darf angezeigt werden. Während einer langsamen Suche abmelden bzw. Konto wechseln; veraltete Abonnementaktionen dürfen nicht erscheinen.
- Kein Eingriff in Supabase oder Nutzerdaten. CI für den neuen Head erneut prüfen. Release weiterhin nicht freigegeben; kein Deployment.

## Auth-Wechsel und asynchrone Profilsuche (09.11.2026)
- Commit `630c3e46b3ec1335fb8ac0b8ad96770b650f4053`: Bei einem Wechsel der angemeldeten Nutzer-ID (auch Abmeldung) wird die Suchgeneration erhöht und die bisherige Profilsuche sofort geleert. Damit bleiben keine alten Folgen-/Entfolgen-Schaltflächen einer vorherigen Sitzung sichtbar; bereits laufende Suchantworten werden verworfen.
- Browser-Regression noch offen: Profil mit angemeldetem Konto suchen, abmelden, kontrollieren, dass Ergebnisse/Aktionsschaltflächen verschwinden; anschließend eine absichtlich verzögerte Suche starten und währenddessen die Sitzung wechseln. Nach dem Wechsel dürfen die alten Ergebnisse nicht zurückkehren.
- Keine Supabase-Migration, keine Produktivdatenänderung, kein Deployment. Für den aktuellen Commit CI separat prüfen.

## Asynchrone Authentifizierungsantworten (09.11.2026, 13 Uhr MEZ)
- Commit `66bc9eacaf7ac0ed3a4c88956056c97f4ccccfcd`: Jede `auth()`-Abfrage bekommt eine Generation. Antworten einer überholten `getUser()`-Anfrage werden ignoriert; ebenso ein Profil-Leseergebnis, wenn währenddessen eine neuere Auth-Abfrage gestartet wurde oder die aktive Nutzer-ID nicht mehr passt. So kann eine langsame frühere Antwort nach einem Sitzungswechsel keine veralteten Profildaten in das Formular zurückschreiben.
- **Noch nachzuweisen:** Browser-Test mit verzögerter `getUser()`- und `wishlist_profiles`-Antwort bei Abmeldung/Kontowechsel; nur der neueste Sitzungszustand darf sichtbar bleiben. Auch Login, Logout, Registrierung und Passwortfeld-Reset prüfen.
- Vor Merge: CI des neuesten Commits und RLS-/Browser-E2E-Prüfungen nachweisen. Keine produktiven Daten verändert; kein Deployment.

## Weitere Verbesserungen (09.11.2026)
- Bereits vorhandene Wünsche werden beim erneuten Hinzufügen derselben ASIN nicht mehr stillschweigend durch ein Upsert überschrieben; die UI weist stattdessen auf die Bearbeitung des bestehenden Wunsches hin. Ein Unique-Constraint-Rennen wird als Duplikat behandelt.
- Profilsuche lässt sich jetzt mit der Eingabetaste auslösen; Tastaturfokus für Textfelder wurde erweitert und Eingabefelder erhalten zusätzliche semantische Attribute.
- Vor Freigabe besonders prüfen: Duplikat-Fehler bei gleichem Produkt, Unverändertheit der vorhandenen Notiz/Priorität, Suche mit Enter sowie Fokusmarkierung mit Tastatur. Die neuen Commits benötigen eigenen CI-Nachweis.

## Entwicklungspaket: Suche, Feed und Barrierefreiheit
- Fehlgeschlagene Feed-Abfragen deaktivieren den Pagination-Button, bis eine neue erfolgreiche Aktualisierung erfolgt; keine unbeabsichtigten weiteren Ladeversuche.
- Nicht existierende Profil-Deep-Links wechseln in eine explizite leere Profilansicht statt stillschweigend den globalen Feed zu zeigen.
- Suchergebnisse und Feed haben beschriftete Live-Regionen; lange Nutzereingaben brechen um.
- Profil-Suchvalidierung wurde als separat getestete Hilfsfunktion zentralisiert, einschließlich Sonderzeichen- und Kurzsuchfällen.
- Vor Merge im Browser überprüfen: ungültiger `?profile=`-Handle, nicht existierendes Profil, langsame/fehlerhafte Feed-Abfragen, Tastaturnavigation und Suchzeichen-Validierung. Keine Testdaten in Produktiv-Supabase.

## Entwicklungspaket: Sitzungswechsel und Bedienbarkeit
- Feed-Aktualisierungen verwenden einen zentralen Refresh-Pfad, damit Pagination und veraltete Antworten konsistent zurückgesetzt werden.
- Nach Ladefehlern bleibt »Weitere Wünsche« deaktiviert, bis der Feed über Filterwechsel oder erneute Aktion aktualisiert wird.
- Bei Nutzerwechsel wird das Wunschformular sofort zurückgesetzt; ein vorheriges Profil bleibt nicht während des asynchronen Nachladens nutzbar.
- Nicht vorhandene Profil-Deep-Links zeigen einen expliziten Hinweis; Notizen können mehrzeilig bearbeitet werden.
- Manuell zu prüfen: Nutzerwechsel bei langsamem Netz, fehlende Profil-Deep-Links, Ladefehler, mehrzeilige Notizen und Bedienung mit Tastatur.

## Paket: Asynchrone Sitzungs- und Fehlerbehandlung
- Asynchrone Profil-Ladevorgänge werden bei Nutzerwechsel über eine separate Generation verworfen; alte Antworten dürfen die neuen Profilfelder nicht überschreiben.
- Nach Profil-, Wunsch- und Abonnement-Schreibvorgängen wird geprüft, ob noch dasselbe Konto aktiv ist, bevor dessen Oberfläche aktualisiert wird.
- Profilsuche zeigt einen Ladezustand und verständliche Fehlermeldungen; fehlgeschlagene Feed-Abfragen zeigen einen Wiederholhinweis.
- Der Pagination-Button startet deaktiviert und wird erst nach einer erfolgreichen Feed-Abfrage aktiviert. Such- und Feed-Bedienelemente sind ihren Ergebnisbereichen zugeordnet.
- Noch offen: manuelle Race-Condition-Tests mit schnellem Kontowechsel und verzögerten API-Antworten sowie echte RLS-API-Tests. Keine Testdatensätze in der Produktivdatenbank.

## Stabilisierung: Pagination und Eingabevalidierung
- Der Feed speichert den Abfrage-Offset beim Start und verwirft Antworten, wenn der Offset inzwischen geändert wurde.
- Ungültige Prioritätswerte wie `null`, `true` oder leere Arrays werden nicht mehr als gültige Zahlen interpretiert.
- Profilsuche verlangt mindestens zwei alphanumerische Suchzeichen; reine Leerzeichen und Bindestriche zählen nicht.
- Zusätzliche Unit-Tests sichern die Randfälle ab.
- CI-Befund für `e6c04eb`: 5 von 6 Workflows erfolgreich; Browser launch smoke scheiterte nach 30 Sekunden im Navigationsfall `kisten` (68/69 Tests erfolgreich). Ursache nicht nachgewiesen; nicht als bestanden werten. Für aktuelle Commits CI erneut prüfen.

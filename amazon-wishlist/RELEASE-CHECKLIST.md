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

## Paket: Browser-Navigation, Feed-Wiederholung und Profilwechsel
- Navigationstests verwenden `noWaitAfter` beim Link-Klick, damit fremde/langsame Seitenressourcen die Navigation nicht unnötig blockieren; URL, sichtbarer Body und nichtleerer Seitentitel bleiben Pflicht.
- Der zuvor einmalige Browser-Timeout (`kisten`, 30 Sekunden) war auf Commit `72821c2` nicht reproduzierbar; alle sechs CI-Workflows dort erfolgreich. Ursache weiterhin nicht abschließend geklärt.
- Der öffentliche Wunsch-Feed besitzt nun eine explizite Schaltfläche »Erneut laden«, auch nach einem Ladefehler.
- Profilfelder werden bei Kontowechsel sofort geleert, bevor asynchron die Daten des neuen Kontos geladen werden.
- Prioritäten akzeptieren nur die kanonischen Werte 1, 2, 3; numerische Umwege wie `01` oder `1e0` werden abgelehnt.
- Vor Freigabe Browser-Test für Wiederholen nach Netzwerkfehler, schnellen Kontowechsel und vollständige CI auf dem letzten Commit nachholen. Kein Deployment.

## Minimaler Freigabe-Gate (Nutzerwunsch: nur notwendige Tests)
1. Letzter Commit: `node --check amazon-wishlist/app.mjs` und bestehende Amazon-Unit-Tests müssen erfolgreich sein; GitHub-Workflow `Amazon wishlist checks` muss grün sein.
2. Bestehender Browser-Smoke-Workflow muss auf dem letzten Commit erfolgreich sein. Keine zusätzlichen umfangreichen Testkampagnen ohne konkreten Befund.
3. Vor einer öffentlichen Freigabe bleiben zwingend: echter Nachweis, dass fremde Konten per RLS keine Profil-/Wunschdaten ändern können; Auth-/E-Mail-Konfiguration und rechtliche/Moderationsanforderungen klären. Keine Testdaten in produktiver Supabase anlegen.
4. Kein automatischer Merge, kein Deployment. Die vollständige ältere Checkliste bleibt als Referenz bestehen, ist aber nicht als sofort durchzuführender Testumfang zu verstehen.

## Aktuelles Entwicklungspaket
- Bei belegtem Benutzernamen erscheint eine verständliche Fehlermeldung; fehlgeschlagene Produkt-Retry-Abfragen geben ihren tatsächlichen Fehler zurück.
- Bearbeitungsaktionen merken sich die Wunsch-ID vor asynchronen Änderungen; doppelte manuelle Button-Deaktivierungen wurden entfernt.
- Escape leert die Profilsuche; beim Verlassen der Profilansicht wird die alte Profilauswahl verworfen.
- Formularaktionsbuttons haben explizite Typen und das Suchfeld verweist auf den Ergebnisbereich.

## Kritische Korrekturen nach CI-Fehler
- Der Amazon-Wishlist-Workflow schlug auf Commit `3fd8e44` fehl; ein fehlender JavaScript-Anweisungstrenner im Lösch-Handler wurde korrigiert.
- Beim Anlegen eines Wunsches wird vor dem endgültigen Insert geprüft, ob noch dasselbe Konto aktiv ist.
- Leere Auth-Antworten werden ohne Laufzeitabbruch verarbeitet; ein Fehler beim Laden eines Profil-Deep-Links führt zu einem sichtbaren Hinweis statt zum allgemeinen Feed.
- Weiterhin nur notwendige Gates: Syntaxprüfung, vorhandene Unit-Tests und vorhandene Browser-CI. Keine produktiven Testdatensätze.

## Sicherheitsnachbesserung (09.11.2026, 14 Uhr MEZ)
- `auth()` behandelt einen Fehler bei `getUser()` jetzt fail-closed: eine zuvor sichtbare Sitzung wird aus dem UI entfernt, Profil-/Editorzustand zurückgesetzt und veraltete Suchergebnisse beim Identitätswechsel verworfen; der Fehler wird anschließend weiterhin an den Aufrufer gemeldet.
- Bei fehlgeschlagener `signOut()`-Anfrage wird das Passwortfeld ebenfalls zuverlässig per `finally` geleert. Ein fehlgeschlagenes Sign-out gilt ausdrücklich **nicht** als erfolgreich abgemeldet; die Session wird dadurch nicht fälschlich bestätigt oder serverseitig verändert.
- Code-Commit `6b02715fa9e0c2c3702c90ac5b00b8a3533b2dd8`. Notwendige Prüfungen: `node --check amazon-wishlist/app.mjs`, bestehende Wishlist-Unit-Tests und CI des letzten Heads; vor Freigabe zusätzlich Browser-Regression für getUser-Fehler nach zuvor erfolgreicher Anmeldung. Kein produktiver Datenbank-Schreibzugriff, kein Merge, kein Deployment.

## Nächstes Stabilisierungspaket (minimaler Testumfang)
- Importierte Amazon-Produktlinks bleiben bei bereits angemeldeten Konten nach dem ersten Auth-Aufruf erhalten.
- Beim Wechsel zwischen Konten wird der vorherige Feed sofort geleert und seine laufende Anfrage invalidiert; der neue Feed wird anschließend geladen.
- Wiederholte Auth-Prüfungen ohne angemeldetes Konto setzen den Wunsch-Editor nicht unnötig zurück.
- Nach erfolgreichem Wunsch-Insert wird das Eingabeformular vor dem Feed-Refresh geleert, damit ein separater Ladefehler keinen vermeintlich ungespeicherten Wunsch zurücklässt.
- Vorheriger Commit `1eda734`: alle sechs GitHub-CI-Workflows erfolgreich. Für den aktuellen Commit gilt der CI-Status separat.

## Stabilisierung: Sessionwechsel und Pagination
- Stand `afa5cb0`: sechs GitHub-Workflows erfolgreich.
- Beim Feed-Neuladen wird die Schaltfläche »Weitere Wünsche« bis zur erfolgreichen neuen Seite deaktiviert.
- Erfolgsmeldungen nach Profil-, Wunsch- und Follow-Aktionen prüfen nach asynchronem Feed-Refresh erneut die aktive Sitzung.
- Der Feed wird erst geleert, nachdem die vom Server gelieferte Seite erfolgreich validiert wurde.
- Es bleiben nur die bestehenden notwendigen CI-Gates; keine neuen Testdaten in der produktiven Datenbank.

## Produktlink-Import: einmalig statt wiederholt
- Der importierte Amazon-Link aus `?url=` wird beim ersten Laden übernommen und beim initialen Auth-Übergang für angemeldete Nutzer wiederhergestellt.
- Spätere Auth-Statusprüfungen und Kontowechsel überschreiben keine manuell eingegebene Produkt-URL mehr mit dem ursprünglichen Link.
- Vorheriger Stand `aabdcf8`: alle sechs CI-Workflows erfolgreich; aktueller Stand benötigt eigenen CI-Abschluss.

## Prüfung vom 09.11.2026 (16 Uhr MEZ)
- Für vorherigen Code-Head `acc3673ed6ac933d5be0f4d19ec70542c73f2f28` sind sechs GitHub-Actions-Workflows erfolgreich abgeschlossen.
- Korrektur für anonym geöffneten `?url=`-Produktlink: Beim späteren Anmelden wird der unverändert im Editor stehende kanonische Link trotz Formular-Reset erhalten. Ein vom Nutzer ersetzter Link wird nicht durch den ursprünglichen URL-Parameter überschrieben. Code-Commits `cfc6a5b`, `3216030`; Regressionstest `e1a0a77`.
- Noch nachzuweisen: CI des aktuellen Heads, Browserablauf »geteilten Link anonym öffnen → anmelden → URL im Editor prüfen« und Browser-/RLS-Negativtests. Keine Testdatensätze, produktiven Datenbankänderungen, Merge- oder Deployment-Aktionen.

## Feed- und Suchergebnis-Konsistenz
- Feed-Elemente werden zunächst in einem `DocumentFragment` aufgebaut und erst nach erneuter Prüfung des Anfragezustands gemeinsam in die Oberfläche eingefügt. Dadurch werden veraltete Teilseiten bei zwischenzeitlichen Filter-/Sitzungswechseln nicht mehr angezeigt.
- Suchantworten werden verworfen, wenn sich der Eingabetext während der Datenbankabfrage verändert hat.
- Vorheriger Commit `b17eefc`: sechs CI-Workflows erfolgreich; für den neuesten Commit ist das Ergebnis separat zu prüfen.

## Weitere notwendige Korrekturen
- Alte Feed-Ladefehler überschreiben keine Oberfläche mehr, wenn bereits ein neuer Feed-Refresh wartet.
- Die Profilsuche prüft Eingaben vor der Ladeanzeige; ungültige öffentliche Profil-Links erhalten eine verständliche Meldung.
- Hintergrund-Aktualisierungen des Profils erhalten noch nicht gespeicherte Formularänderungen, solange der Benutzer nicht gewechselt wurde.
- Erfolgsmeldungen nach Profiländerungen prüfen die Sitzung erneut.
- Nur bestehende CI-Checks, keine Testdaten und keine Änderungen an produktiven Supabase-Tabellen.

## Nachprüfung: ungespeicherte Profilfelder (09.11.2026, 17 Uhr MEZ)
- Commit `45d9457`: Bei Hintergrundaufrufen von `auth()` und noch nicht angelegtem Profil werden bereits eingetippte, ungespeicherte Werte für Benutzername, Anzeigename und Beschreibung nicht mehr wegen `previousProfile === null` überschrieben. Bei einem tatsächlichen Kontowechsel bleiben die bestehenden Zurücksetzungen aktiv.
- Gezielte Browser-Regression erforderlich: angemeldet ohne vorhandenes Profil, Formular teilweise ausfüllen, Auth-Statusereignis auslösen und unveränderte Eingaben prüfen; danach abmelden und leere Profilfelder prüfen. Keine Testkonten/-daten in der Produktivdatenbank anlegen.
- GitHub-Abfrage nach PR-Workflow-Runs für `6737d03` und `45d9457` ergab jeweils eine leere Liste; **kein CI-Erfolgsnachweis**. Die API-Abfrage ist auf PR-getriggerte Runs begrenzt. Vor Merge den aktuellen Head und alle erforderlichen Checks über GitHub Actions/PR-Checks eindeutig bestätigen.
- Keine Datenbankänderungen, kein Merge und kein Deployment.

## Schutz neuer Wunsch-Entwürfe bei langsamen Speicheraktionen
- Ein Editor-Revisionszähler wird bei manuellen Änderungen, Bearbeitungswechseln und Reset erhöht. Nach asynchronem Speichern wird das Formular nur geleert, wenn der Entwurf zwischenzeitlich unverändert geblieben ist.
- Ein aus einem alten Feed stammender Löschbutton lehnt die Aktion ab, wenn der Wunsch nicht dem inzwischen angemeldeten Konto gehört. Die Datenbankabfrage bleibt zusätzlich auf `user_id` eingeschränkt.
- Freigabe bleibt ausstehend; keine produktiven Daten verändert und keine zusätzlichen Testdatensätze angelegt.

## Prüfung vom 09.11.2026 (18 Uhr MEZ): Veraltete Folgen-Aktionen
- Code-Commit `17f3e614b2141adb18e7425ce123ff07eb01a880`: Ein bereits gerenderter Folgen-/Entfolgen-Button prüft vor dem Supabase-Schreibzugriff zusätzlich, ob die aktuelle Nutzer-ID zur ursprünglichen Suche passt, die Suchgeneration unverändert ist und das Suchergebnis noch im DOM hängt. Damit können veraltete Suchergebnisse nach Kontowechsel oder erneuter Suche keine neuen Abonnementänderungen mehr auslösen. Die bestehende Datenbank-RLS bleibt die maßgebliche Autorisierung.
- Noch offen: gezielter Browser-Regressionstest (Suchergebnis anzeigen, Konto wechseln bzw. neue Suche starten, veralteten Button auslösen; keine Mutation); CI-Nachweis für den neuen Head und vollständige RLS-Negativtests. Keine produktiven Datensätze oder Policies verändert, kein Merge, kein Deployment.


## Prüfung vom 09.11.2026 (19 Uhr MEZ): Veraltete Feed-Fehler
- Code-Commit `c01d857682d94b85ee4a69350b57b77d2c86adee`: Fehler einer Feed-Abfrage, die währenddessen durch Filter-, Sortier-, Offset-, Profil- oder Sitzungswechsel veraltet ist, werden nicht mehr als aktueller Fehler an die UI gemeldet. Stattdessen wird die aktuelle Feed-Abfrage nach dem laufenden Request nachgeholt. Aktuelle Fehler werden weiterhin angezeigt und geworfen.
- Prüfgrenze: Für `c01d857` lieferten sowohl die commitbezogene PR-Workflow-Abfrage als auch die Combined-Status-Abfrage leere Listen; das belegt keinen erfolgreichen CI-Lauf. Ein lokaler Git-Checkout scheiterte an DNS-Auflösung für `github.com`; deshalb wurden weder `node --check` noch Unit-Tests lokal ausgeführt.
- Nächste konkrete Prüfung: GitHub Actions am aktuellen Head auf erfolgreiche Wishlist- und Browser-Smoke-Checks kontrollieren; bei verfügbarem Checkout `node --check amazon-wishlist/app.mjs && node --test amazon-wishlist/*.test.mjs` ausführen. Im Browser eine langsame fehlgeschlagene Feed-Anfrage starten, währenddessen Filter wechseln; die veraltete Fehlermeldung darf den neuen Feed nicht überschreiben. Kein Merge, Deployment oder produktiver Datenbankzugriff.

## Feed-Fehlerpfad: Scope-Korrektur (09.11.2026, 19 Uhr MEZ)
- Code-Commit `b0d12ad0ba0c1ee605a055978b9c717d16fba540`: `isStale()` wird nun vor dem `try` in `feed()` definiert und ist damit auch im `catch` sichtbar. Zuvor konnte ein Feed-Abfragefehler im Fehlerhandler selbst einen `ReferenceError` auslösen, sodass die beabsichtigte Unterscheidung zwischen veralteten und aktuellen Fehlern ausfiel.
- Änderung ausschließlich an JavaScript-Steuerfluss; keine Supabase-Daten, Policies oder Schemaänderungen.
- Noch offen: `node --check amazon-wishlist/app.mjs`, `node --test amazon-wishlist/*.test.mjs`, aktueller GitHub-Actions-Lauf und Browser-Negativfall (fehlgeschlagene Feed-Abfrage sowie veraltete Antwort bei Filterwechsel). Die commitbezogene GitHub-Abfrage lieferte zum Prüfzeitpunkt keine Runs oder Statuschecks; dies ist kein Erfolgsnachweis.
- PR bleibt Draft; kein Merge, Deployment oder Veröffentlichung.

## Feed-Freshness-Regression (09.11.2026, 21 Uhr MEZ)
- `838e2f0`: Reiner Helper `isFeedRequestStale` vergleicht Offset, Revision, Filter, Sortierung, Nutzer-ID und Profil-ID einer Feed-Anfrage mit dem aktuellen UI-Zustand.
- `ef0610d`: Der Feed verwendet diesen Helper sowohl nach asynchronen Abfragen als auch im Fehlerpfad. Die lokale `isStale`-Closure bleibt außerhalb des `try`-Blocks, damit auch `catch` sie verwenden kann.
- `2bcf965`: Unit-Test für unveränderten Zustand und jede einzelne Zustandsänderung (einschließlich Abmeldung/Kontowechsel) ergänzt.
- **Kein Test-Erfolgsnachweis:** Die commitbezogene GitHub-Abfrage für `2bcf965` ergab weder PR-Workflow-Runs noch Combined-Statuses. Ein lokaler Checkout scheitert an DNS-Auflösung für github.com; die Node-Suite wurde deshalb nicht ausgeführt. Nächste Aktion: `node --check amazon-wishlist/app.mjs && node --check amazon-wishlist/wishlist-utils.mjs && node --test amazon-wishlist/*.test.mjs` im vollständigen Checkout ausführen und die CI-Gates für den neuesten Head verifizieren.
- Kein Supabase-Zugriff, keine Testdaten, kein Merge, Deployment oder Veröffentlichung.

## D – Community und E – Bedienbarkeit (09.11.2026, 22 Uhr MEZ)
- Mobile Gestaltung: flexible Abstände, größere Schaltflächen, mobile Aktionsgruppen, responsive Überschriften und gut lesbare Eingabefelder; Tastatur-Sprunglink zum Hauptinhalt ergänzt.
- Öffentliche Inhalte: Hinweise gegen personenbezogene Daten Dritter, rechtswidrige Inhalte, Beleidigungen und unerwünschte Werbung sichtbar ergänzt. Das sind Hinweise, **keine** serverseitige Moderation oder wirksame Anti-Spam-Sperre.
- Profilsuche und Feed haben zusätzliche Bedienhinweise, einschließlich Escape-Taste und erneuter Ladeaktion.
- **Vor öffentlicher Freigabe offen:** verbindliche Community-Regeln, ein tatsächlicher Melde-/Moderationsprozess mit Verantwortlichkeiten und datenschutzgerechtem Ablauf, serverseitiges Rate Limiting/Abuse-Schutz. Keine funktionslose Melden-Schaltfläche vortäuschen.
- Nur notwendige Checks: HTML/Browser-Smoke und vorhandene Wishlist-Tests am letzten Commit; manuelle kurze Tastatur-/Mobilprüfung. Kein Eingriff in produktive Supabase-Daten oder Policies, kein Merge/Deployment.

## Profil-Lesefehler und aktueller Qualitätsnachweis (09.11.2026, 22 Uhr MEZ)
- Code-Commit `6c4ea8bc7c18fbf3a2ec5be49a138b5ab5042226`: Scheitert der `wishlist_profiles`-Lesezugriff für die weiterhin aktuelle Sitzung, wird das im Client zwischengespeicherte Profil vor der Fehlerweitergabe invalidiert. Damit kann ein vorheriger Profilzustand nicht mehr als erfolgreiche aktuelle Profilprüfung für `saveWish` dienen. Bei veralteten Antworten greifen weiterhin die Generation-/Identitätsprüfungen.
- Gezielter Browser-Negativtest offen: Nach erfolgreicher Profilanzeige Profil-SELECT fehlschlagen lassen und `auth()` erneut auslösen; neue Wunsch-Speicherung muss bis zu einer erfolgreichen Profilprüfung abgewiesen werden. Bereits gespeicherte Daten dürfen sich nicht ändern.
- GitHub ist maßgebliche Übergabequelle. Git-Checkout in dieser Ausführungsumgebung wegen DNS-Auflösung von github.com nicht möglich; keine lokalen Node- oder Browser-Tests behaupten. CI-Runs für den neuesten Head gesondert nachweisen. Kein produktiver Supabase-Zugriff, keine Testdaten, kein Merge, kein Deployment.

## Auth-Ausnahme bei Netzwerkfehler (09.11.2026, 22 Uhr MEZ)
- Commit `c9922cf61a556459363b57b9603f75d8de62acb4`: `auth()` fängt nun auch eine **Promise-Rejection** von `db.auth.getUser()` ab und behandelt sie über denselben fail-closed-Pfad wie ein zurückgegebenes Auth-Fehlerobjekt. Vorher konnte eine geworfene Ausnahme die Funktion vor dem Entfernen des alten Benutzer-/Profilzustands verlassen.
- Eine überholte Auth-Antwort wird weiterhin anhand der Generation ignoriert. Eine fehlgeschlagene Auth-Prüfung bestätigt keine Sitzung und verändert keine Supabase-Daten.
- Regression noch offen: Nach bestehender Anmeldung `getUser()` gezielt als Rejection simulieren und sicherstellen, dass Editor, Profilfelder und Folgeaktionen nicht mehr als angemeldet angezeigt werden; zusätzlich schnelle Folgeaufrufe mit vertauschter Antwortreihenfolge prüfen.
- Commitbezogene GitHub-PR-Workflow- und Combined-Status-Abfragen für den Ausgangs-Head `ce80161` waren leer; **kein** CI-Nachweis. Lokaler Git-Checkout wegen DNS-Auflösung von github.com nicht möglich. Nächste Aktion: bestehenden `Amazon wishlist checks` und Browser-Smoke für den neuesten Head prüfen; im vollständigen Checkout `node --check amazon-wishlist/app.mjs && node --test amazon-wishlist/*.test.mjs` ausführen.
- Keine Testdaten, keine Supabase-Schema-/Policy-/Datenänderungen, kein Merge, Deployment oder Veröffentlichung.

## Profilabfrage: Promise-Rejection abgesichert (09.11.2026)
- Commit `5b0327e212501506cd94377c2b448871c17fdb32`: Nicht nur Supabase-Fehlerobjekte, sondern auch geworfene Fehler aus dem Profil-SELECT werden nach Prüfung von Auth-/Profilgeneration und Nutzeridentität über denselben fail-closed-Pfad verarbeitet. Das zuvor zwischengespeicherte Profil wird bei einem aktuellen Fehler invalidiert; alte Anfragen dürfen eine neue Sitzung nicht beeinträchtigen.
- Noch offen: Browser-Negativtest mit absichtlich zurückgewiesenem Profil-SELECT nach bereits geladenem Profil sowie Test für überholte Rejection nach Kontowechsel. Keine Testdaten in Produktion.
- CI für den aktuellen Branch-Head gesondert nachweisen. Keine Datenbank-, Merge- oder Deployment-Aktionen.

## D/E – Community-Regeln und barrierearme Ergebnisdarstellung
- Öffentliche Inhaltsregeln sind als aufklappbarer Bereich sichtbar: Datenschutz Dritter, Beleidigungen/Drohungen, Spam und irreführende Angaben. Es wird ausdrücklich darauf hingewiesen, dass Meldefunktion und Moderation noch fehlen.
- Feed-Einträge erhalten visuell getrennte Karten; Statusmeldungen sind für Screenreader atomar und Feed/Profilsuche kennzeichnen laufende Anfragen mit `aria-busy`.
- Offene Pflichtarbeit unverändert: tatsächliche Meldemöglichkeit, Moderationsverantwortung, serverseitiger Missbrauchsschutz und Freigabeprüfungen. Keine unbestätigten Kontaktadressen oder funktionslosen Aktionen erfunden.
- Bestehende CI- und Browser-Smoke-Checks am aktuellen Head prüfen; keine produktiven Datenbankänderungen, kein Merge und kein Deployment.

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
- Der jüngste Passwortfeld-Commit `9138fc67de60dfa6ac0b7d36a7ae9f22023bbece` hatte zum Abfragezeitpunkt noch keine zugeordneten Workflow-Runs; sein CI-Erfolg ist daher **nicht bestätigt**.

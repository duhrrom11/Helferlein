# Freigabe- und Funktionstestplan

Status: **Nicht freigegeben**. Der Code liegt im Draft-PR; die folgenden End-to-End-Tests sind noch nicht als erfolgreich nachgewiesen.

## Automatische Tests
- `node --check amazon-wishlist/app.mjs`
- `node --test amazon-wishlist/amazon-links.test.mjs`
- GitHub Actions: Workflow `.github/workflows/amazon-wishlist.yml`; erfolgreichen Lauf vor Merge prüfen.

## Manuelle Browserprüfung (mit eigenen echten Konten, ohne Testdaten in der Produktivdatenbank)
1. Anonyme Startseite öffnen: Login sichtbar, Feed lesbar, keine Bearbeitungsaktionen.
2. Bestehendes Konto anmelden; Profil erstellen, aktualisieren und nach Abmeldung keine Bearbeitungsaktionen sehen.
3. Gültigen Amazon.de-Link und selbst eingegebenen Titel speichern. Doppelte ASIN im eigenen Profil darf keinen zweiten Wunsch erzeugen.
4. Wunsch aus eigenem Konto entfernen; nach Reload muss er fehlen.
5. Fremde Wünsche dürfen nicht bearbeitet oder gelöscht werden; dies auch direkt gegen die API prüfen.
6. Ungültige URLs, fremde Domains, fehlerhafte ASINs und leere Titel müssen abgewiesen werden.
7. Affiliate-Link muss `https://www.amazon.de/dp/ASIN?tag=duhrrom-21` verwenden.
8. Mobile Ansicht, Tastaturbedienung, Fehleranzeigen, Pagination und langsame Netzwerke prüfen.
9. Supabase Auth: E-Mail-Bestätigung, erlaubte Redirect-URLs, Missbrauchsschutz und Rate Limits prüfen.

## Offene Produktanforderungen vor öffentlichem Launch
- Impressum, Datenschutzerklärung, Amazon-Partnerprogramm-Hinweis und Community-Moderation.
- Schutz gegen automatisierte Masseneinträge; RLS verhindert fremde Schreibzugriffe, ersetzt aber kein Rate Limiting.
- Produktmetadaten nur aus erlaubter Quelle; aktuell manuelle Titel ohne Preise oder Bilder.
- Veröffentlichung nur nach Review und bestätigtem CI-/Browser-Test; kein automatischer Merge.

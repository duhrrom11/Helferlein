# Amazon-Wunschlisten – Helferlein-Modul (Entwicklungsstand)

## Festgelegte Konfiguration
- GitHub: `duhrrom11/Helferlein`; Entwicklung ausschließlich per Pull Request.
- Supabase: **bestehendes Projekt `alltagshelfer`** (`avapuibsidubuzxjtyld`), keine zweite Instanz.
- Eigene Tabellen mit Präfix `wishlist_`, keine Änderungen an `user_data`, `wg_spaces`, `wg_members` oder `vault_cloud_snapshots`.
- Amazon.de-Partnerkennung: `duhrrom-21`. Andere Amazon-Marktplätze benötigen eigene, dort gültige Partnerkennungen und bleiben bis dahin ohne Affiliate-Weiterleitung.
- Keine Datenbankmigration oder Aktivierung ohne geprüfte RLS-Policies und Backup-/Rollback-Plan.

## Architektur
- `amazon-links.mjs` validiert Amazon-Domains und ASIN und erzeugt kanonische Produktlinks mit konfigurierbarem Affiliate-Tag.
- Wunschlisten-Datenmodell: `wishlist_profiles`, `wishlist_products`, `wishlist_wishes` und `wishlist_follows` sind im bestehenden Supabase-Projekt als eigene Tabellen mit RLS angelegt. `wishlist_collections` und `wishlist_comments` sind noch nicht umgesetzt.
- Öffentliche Leserechte nur für ausdrücklich veröffentlichte Daten. Schreibrechte ausschließlich für Besitzer mittels `auth.uid()`; keine Freigabe von Auth-E-Mails.
- Keine automatischen Produktmetadaten ohne erlaubte Datenquelle. Kein Scraping, keine erfundenen Preise.
- Öffentlicher Feed, Prioritätssortierung, Profil-Suche, Folgen/Entfolgen, eigene Wunschbearbeitung und teilbare Profil-Links sind im Draft implementiert. Ranking, Trending, Zufall, Tageswunsch, Sammlungen, Kommentare und aggregierte Statistiken folgen stufenweise.
- Moderation, Abuse-Schutz, Pagination und Datenlöschung vor öffentlichem Start.

## Tests und Auslieferung
`node --check amazon-wishlist/app.mjs && node --test amazon-wishlist/*.test.mjs`

**Status:** Browser-App im Entwicklungsbranch, nicht veröffentlicht. Die Wishlist-Tabellen existieren bereits im bestehenden Produktiv-Supabase-Projekt; keine Testdatensätze anlegen. Vor Merge: nachweislich erfolgreiche CI- und Browser-Tests, Security-Review, rechtliche Pflichtseiten und ausdrückliche Freigabe. Siehe `RELEASE-CHECKLIST.md`.

## Übergabe für weitere Entwicklungsläufe
- Historischer Foundation-Draft: https://github.com/duhrrom11/Helferlein/pull/166 (`feature/amazon-wishlist-foundation`) – **nicht als Ausgangspunkt für neue Änderungen verwenden**. Neuere, getrennte Wishlist-PRs vor Arbeitsbeginn prüfen, insbesondere [#227](https://github.com/duhrrom11/Helferlein/pull/227) (Amazon-Link-Regressionstests) und [#229](https://github.com/duhrrom11/Helferlein/pull/229) (Clipboard-Fokus-Fallback).
- **Aktuelle Entwicklungsbasis ist `main`**, nicht der historische PR-#166-Branch. Vor jeder Änderung `main`, die neuesten Wishlist-Commits und offene Wishlist-PRs prüfen; einen separaten Branch vom aktuellen `main` anlegen und vorhandene Änderungen nicht überschreiben. Niemals ungeprüft mergen oder deployen.
- Öffentliche Profilansichten über `?profile=handle`; Auswahl aus der Suche aktualisiert die Browseradresse, ein anderer Feed-Filter entfernt den Profilparameter. `profilePageUrl` ist separat getestet.
- CI-Status und GitHub-Actions-Workflow-Runs explizit prüfen; leere Statuslisten sind **kein** Testnachweis.


## Letzte Sicherheitskorrektur
- Beim gleichzeitigen Anlegen derselben Amazon-ASIN wird ausschließlich PostgreSQL-Fehler `23505` (Unique Constraint) durch erneutes Lesen aufgelöst. Andere Fehler, insbesondere RLS-/Berechtigungsfehler, werden nicht länger durch einen Retry verdeckt.
- Die Funktion »Profil-Link kopieren« verwendet dieselbe kanonische URL-Hilfsfunktion wie die Profilnavigation und erhält unabhängige Query-Parameter.
- Neuer Unit-Test für die Fehlerklassifizierung. Nach Commit `eb0c434` ergaben die GitHub-Abfragen weiterhin keine CI-Statuses und keine commitgebundenen PR-Workflow-Runs. Das ist kein erfolgreicher Testnachweis. Lokaler Repository-Download aus der Ausführungsumgebung scheitert derzeit an DNS-Auflösung für github.com.

## Freigabestand (10.11.2026)
- `main` enthält bereits neuere Wishlist-Sicherheitskorrekturen, darunter Commit [`619ae4d`](https://github.com/duhrrom11/Helferlein/commit/619ae4d793ae5ac1ec97b005e112cbc36d872d6c) zur Reduktion sichtbarer Backend-Fehler. Dieser Commit ist **kein Nachweis**, dass alle offenen PRs integriert oder getestet sind.
- Für jeden neuen PR den tatsächlichen Head und dessen CI-Ergebnisse separat prüfen; `node --check amazon-wishlist/app.mjs && node --test amazon-wishlist/*.test.mjs` im vollständigen Checkout ausführen. Ein bloßes Abrufen von Dateien ersetzt keinen Testlauf.
- Offene Browser-/RLS-Negativtests, Abuse-Schutz, rechtliche Pflichtangaben und manuelle Freigabe bleiben verbindlich. Keine Testdaten oder riskanten Änderungen in der produktiven Supabase-Datenbank.

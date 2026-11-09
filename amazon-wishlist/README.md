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
- Draft-PR: https://github.com/duhrrom11/Helferlein/pull/166; Branch: `feature/amazon-wishlist-foundation`.
- Immer zuerst den neuesten Branch-Stand lesen. Änderungen nur auf diesem Branch; niemals ungeprüft mergen oder deployen.
- Öffentliche Profilansichten über `?profile=handle`; Auswahl aus der Suche aktualisiert die Browseradresse, ein anderer Feed-Filter entfernt den Profilparameter. `profilePageUrl` ist separat getestet.
- CI-Status und GitHub-Actions-Workflow-Runs explizit prüfen; leere Statuslisten sind **kein** Testnachweis.


## Letzte Sicherheitskorrektur
- Beim gleichzeitigen Anlegen derselben Amazon-ASIN wird ausschließlich PostgreSQL-Fehler `23505` (Unique Constraint) durch erneutes Lesen aufgelöst. Andere Fehler, insbesondere RLS-/Berechtigungsfehler, werden nicht länger durch einen Retry verdeckt.
- Die Funktion »Profil-Link kopieren« verwendet dieselbe kanonische URL-Hilfsfunktion wie die Profilnavigation und erhält unabhängige Query-Parameter.
- Neuer Unit-Test für die Fehlerklassifizierung. Nach Commit `eb0c434` ergaben die GitHub-Abfragen weiterhin keine CI-Statuses und keine commitgebundenen PR-Workflow-Runs. Das ist kein erfolgreicher Testnachweis. Lokaler Repository-Download aus der Ausführungsumgebung scheitert derzeit an DNS-Auflösung für github.com.

# Amazon-Wunschlisten – Helferlein-Modul (Entwicklungsstand)

## Festgelegte Konfiguration
- GitHub: `duhrrom11/Helferlein`; Entwicklung ausschließlich per Pull Request.
- Supabase: **bestehendes Projekt `alltagshelfer`** (`avapuibsidubuzxjtyld`), keine zweite Instanz.
- Eigene Tabellen mit Präfix `wishlist_`, keine Änderungen an `user_data`, `wg_spaces`, `wg_members` oder `vault_cloud_snapshots`.
- Amazon.de-Partnerkennung: `duhrrom-21`. Andere Amazon-Marktplätze benötigen eigene, dort gültige Partnerkennungen und bleiben bis dahin ohne Affiliate-Weiterleitung.
- Keine Datenbankmigration oder Aktivierung ohne geprüfte RLS-Policies und Backup-/Rollback-Plan.

## Architektur
- `amazon-links.mjs` validiert Amazon-Domains und ASIN und erzeugt kanonische Produktlinks mit konfigurierbarem Affiliate-Tag.
- Wunschlisten-Datenmodell: `wishlist_profiles`, `wishlist_products`, `wishlist_wishes`, später `wishlist_follows`, `wishlist_collections`, `wishlist_comments`.
- Öffentliche Leserechte nur für ausdrücklich veröffentlichte Daten. Schreibrechte ausschließlich für Besitzer mittels `auth.uid()`; keine Freigabe von Auth-E-Mails.
- Keine automatischen Produktmetadaten ohne erlaubte Datenquelle. Kein Scraping, keine erfundenen Preise.
- Ranking, Feed, Trending, Zufall, Tageswunsch, Sammlungen, Kommentare und aggregierte Statistiken folgen stufenweise.
- Moderation, Abuse-Schutz, Pagination und Datenlöschung vor öffentlichem Start.

## Tests und Auslieferung
`node --test amazon-wishlist/amazon-links.test.mjs`

Aktuell nur isolierte Hilfsfunktionen und Planung, **keine produktive Integration**. Vor Merge: Tests, Security-Review, Staging-Migration und Freigabe der Integration.

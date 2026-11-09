# Supabase-Produktionsaudit – 2026-11-09

Projekt: `alltagshelfer` (eu-central-1). **Nur Metadaten und Advisors gelesen, keine Schreiboperationen.**

## Befunde

- Projektstatus bei Abfrage: `ACTIVE_HEALTHY`, PostgreSQL 17.
- Alle neun geprüften Tabellen im Schema `public` haben Row Level Security aktiviert: `helferlein_ops_entries`, `user_data`, `vault_cloud_snapshots`, `wg_members`, `wg_spaces`, `wishlist_follows`, `wishlist_products`, `wishlist_profiles`, `wishlist_wishes`. Dies beweist **nicht**, dass jede einzelne Policy korrekt ist.
- Supabase Security Advisor: **WARN – Leaked Password Protection Disabled**. [Offizielle Abhilfe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth-Einstellung erst nach Prüfung von Auswirkungen und Berechtigungen aktivieren.
- Performance Advisor: sechs als ungenutzt markierte Indizes (`wg_members_user_idx`, `wg_spaces_owner_idx`, `wishlist_wishes_created_idx`, `wishlist_wishes_product_idx`, `wishlist_follows_followed_idx`, `wg_members_owner_idx`). **Nicht löschen**: kurze Nutzungszeiträume und seltene Abfragen können die Statistik verfälschen. [Linter-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Öffentliche PostgreSQL-Funktion `public.helferlein_ops_revision`: `SECURITY INVOKER`; laut Privilegienabfrage durch `anon` und `authenticated` ausführbar. Zugriffsbedarf separat prüfen, bevor Privilegien geändert werden.

## Sichere nächste Schritte

1. Passwort-Leak-Schutz in Auth-Konfiguration prüfen und nach dokumentierter Kompatibilitätskontrolle einschalten.
2. RLS-Policies und Tabellen-Grants detailliert **nur lesend** inventarisieren.
3. Öffentliche Funktionsrechte anhand der tatsächlichen Frontend-Aufrufe prüfen.
4. Indizes erst nach Auswertung von realen Abfrageplänen und längerer Nutzungsstatistik beurteilen.
5. Tresor-API-Gate und unveränderte Bestandsdaten als harte Freigabegrenze beibehalten.

Keine Testdaten, keine produktiven Schreibzugriffe, keine Datenmigration in diesem Audit.

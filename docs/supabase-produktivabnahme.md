# Supabase-Produktivabnahme – Stand 2026-11-08

**Projekt:** `alltagshelfer` (`avapuibsidubuzxjtyld`). Keine Testdaten oder Änderungen an bestehenden Tresoren.

## Bestätigte Befunde

- Acht Tabellen im Schema `public` haben Row Level Security aktiviert: `user_data`, `vault_cloud_snapshots`, `wg_spaces`, `wg_members`, `wishlist_profiles`, `wishlist_products`, `wishlist_wishes`, `wishlist_follows`.
- Der Supabase-Sicherheitsberater meldet `auth_leaked_password_protection` (WARN): Schutz gegen kompromittierte Passwörter ist deaktiviert. Aktivierung muss über die Auth-Konfiguration geprüft und vorgenommen werden.
- `list_edge_functions` liefert im Produktivprojekt keine bereitgestellten Edge Functions.
- Im Repository existiert `supabase/functions/vault-api/index.ts`, ausdrücklich als noch nicht aktivierte Tresor-API. Sie verweist auf `vault_ownership` und gibt selbst bei erfolgreicher Eigentumsprüfung nur `vault_access_not_configured` zurück. Die Tabelle `vault_ownership` ist in der derzeit geprüften öffentlichen Tabellenliste nicht vorhanden. **Nicht ungeprüft deployen.**
- `scripts/release-smoke.cjs` prüft die Homepage, verlinkte HTML-Dateien und die Syntax von Inline-Skripten. Es ist kein Ende-zu-Ende-Test mit realer Anmeldung, Synchronisierung oder Wiederherstellung.

## Freigabebedingungen (noch nicht bestätigt)

- [ ] Passwortschutz gegen kompromittierte Passwörter aktiviert und verifiziert
- [ ] Anmelden, Abmelden und Sitzungserneuerung in der veröffentlichten App geprüft
- [ ] Benutzertrennung für alle persönlichen Daten, WG-Rollen und Wunschlisten geprüft
- [ ] Speichern, Laden und Konfliktverhalten der Cloud-Synchronisierung geprüft
- [ ] Tresor-Wiederherstellung und Eigentumsnachweis sicher implementiert oder ausdrücklich als nicht verfügbar gekennzeichnet
- [ ] Datenschutzkonformes Backup-/Wiederherstellungskonzept für die Produktionsdaten bestätigt
- [ ] Release-Smoke-Prüfung und reale Browser-Abnahme bestanden

**Wichtig:** Die Anzahl früherer SQL-Berechtigungsänderungen ist kein Ersatz für diese Freigabebedingungen. Bis zur Prüfung nicht behaupten, dass sämtliche Supabase-Funktionen vollständig live sind.

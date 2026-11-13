# A10 Gate 3 – Cloud-Ownership, RLS und Edge-Authorisierung (statische Abnahme, 2026-11-13)

**Status: NO-GO.** Diese Abnahme liest ausschließlich Repository-Code, SQL-Entwürfe und vorhandene Dokumentation. Sie führt **keine** Supabase-Abfrage, Datenbankänderung, Migration, Edge-Bereitstellung oder Testdatenanlage durch. Die bestehende Produktivkonfiguration wurde nicht verändert.

## Befund und konkrete Korrektur

Die bereits dokumentierte Konfiguration `supabase/config.toml` fordert für `heir-invitations` und `heir-redemption` zusätzlich zur JWT-Prüfung einen **ausdrücklichen serverseitigen Opt-in** durch `HEIR_INVITATIONS_ENABLED=true` bzw. `HEIR_REDEMPTION_ENABLED=true`. Beide Edge-Entrypoints prüften bislang jedoch nur, ob URL, Anon-Key und Service-Role-Key vorhanden waren. Da die Schlüssel in Supabase-Umgebungen regulär bereitstehen können, war das dokumentierte Deaktivierungsversprechen **im Code nicht durchgesetzt**. Dieser PR ergänzt für beide Funktionen die strikte Prüfung auf den exakten String `"true"`. Ohne Flag antwortet der vorhandene fail-closed Pfad mit 503, bevor die Service-Role-RPCs verwendet werden. Es wird **kein Flag gesetzt** und keine Funktion deployed.

Ein gezielter Source-Contract-Test prüft diese beiden Opt-ins, `verify_jwt=true`, die `auth.getUser`-Grenze, den Eigentümerfilter und die reine Metadatenantwort der `vault-api`, sowie RLS-/REVOKE- und Service-Role-RPC-Verträge der bestehenden privaten Einladungs-Tabellen. Der isolierte CI-Workflow wird nun auch bei Änderungen an den Edge-Entrypoints ausgeführt. Diese Tests ersetzen **keine** Live-RLS-Abnahme.

## Weitere statische Feststellungen

- **Owner-Metadaten-API:** `vault-api` validiert den Bearer über `auth.getUser(token)`, liest ausschließlich `vault_id, owner_user_id, updated_at` über den aufrufenden JWT/RLS-Kontext und filtert `owner_user_id` zusätzlich nach der verifizierten `user.id`. Kein Service-Role-Schlüssel und kein Cloud-Write in diesem Endpunkt.
- **Private Einladungen:** Die vorhandenen `nachlass_private`-Tabellen haben RLS, keine Browser-Direktrechte; `SECURITY DEFINER`-RPCs sind nur für `service_role` ausführbar. Die Edge-Entrypoints dürfen die Eigentümeridentität nur aus verifiziertem Supabase Auth übernehmen. Die private Erbenfreigabe selbst wird damit **nicht** freigegeben.
- **V2-Erben-Schema:** `docs/nachlass-v2-isolated-rls-proposal.sql` und `docs/nachlass-v2-rls-policy-draft.sql` sind **Review-only**. Sie dürfen nicht als produktive Migration interpretiert werden. Direkte Erben-SELECT-Rechte fehlen bewusst; ohne auditierten transaktionalen Serverpfad bleibt die Freigabe gesperrt.
- **Offener PostgreSQL-Berechtigungsblocker:** `docs/nachlass-v2-db-role-security-review.md` dokumentiert, dass `SELECT ... FOR SHARE` nicht mit einer ausschließlich lesenden Rolle kompatibel ist. Weder breite UPDATE-Rechte noch BYPASSRLS oder ein unreviewter SECURITY-DEFINER-Endpunkt sind als Workaround zulässig.
- **Weitere Release-Blocker:** Unabhängige Zwei-Identitäten-/Widerrufs-/Race-Abnahme auf isolierter Infrastruktur, echte produktive Owner-Zuordnung, Session-Widerruf, Cloud-RLS-/RPC-Berechtigungsnachweis, begrenzte Privilegien, vollständiger Recovery-/Rollback-Test und gesonderte Freigabeentscheidung.

**Entscheidung:** Nur der Code-Fix und die CI-Abnahme sind zur Zusammenführung geeignet. Es erfolgt **keine produktive Aktivierung**, keine SQL-Anwendung, keine Secret-/Flag-Änderung, keine Datenmigration und keine V1-Löschung. A10 bleibt **NO-GO**.

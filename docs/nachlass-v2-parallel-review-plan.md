# Nachlass v2 — isolierter Parallel- und Privilegientest (REVIEW ONLY)

**Status:** Plan, keine Migration und kein Test auf Produktivdaten. Der SQL-Entwurf ist nicht freigegeben.

## Voraussetzungen

- Ausschließlich eine **wegwerfbare lokale PostgreSQL-17-Instanz** mit synthetischen IDs und verschlüsselten Dummy-Umschlägen. Keine produktiven Daten und keine persistenten Änderungen an Supabase.
- Zwei **unabhängige PostgreSQL-Sessions** A (Leser) und B (Widerruf); Admin-Session nur für die isolierte Testeinrichtung.
- Dedizierter `NOLOGIN`-Funktionsbesitzer mit geprüften minimalen Tabellenrechten und dedizierte Serverrolle ohne Tabellenrechte, `BYPASSRLS` oder Schreibrechte. RLS-Eigentümereffekt und `FORCE ROW LEVEL SECURITY` gesondert prüfen.
- Funktionsschema nicht über Data API exponieren; `USAGE` und `EXECUTE` ausschließlich für die geprüfte Serverrolle. `PUBLIC`, `anon`, `authenticated`, `service_role` dürfen nicht direkt ausführen. `pg_proc.proacl`, `pg_roles.rolbypassrls`, `has_function_privilege`, `has_table_privilege` und Rollenmitgliedschaften prüfen.
- Server muss vor dem Funktionsaufruf `auth.getUser(token)` ausführen. Eine vom Aufrufer gewählte Erben-UUID darf niemals als verifizierte Identität übernommen werden.

## Ablauf mit zwei Sessions

1. **Widerruf vor Lesen:** B widerruft und committet. A liest danach; erwartet NULL.
2. **Lesen vor Widerruf:** A hält die `FOR SHARE`-Sperre in offener Transaktion. B versucht UPDATE auf dieselbe Mitgliedschaft; `lock_timeout` muss die Blockierung nachweisen. Nach A-COMMIT widerruft B; erneutes Lesen ergibt NULL.
3. **Widerruf vor Sperrerwerb:** B hält ein uncommittetes UPDATE. A versucht parallel zu lesen. Nach B-COMMIT darf kein Umschlag zurückgegeben werden; B-ROLLBACK ist ein separater Fall.
4. **Konkurrierende Freigabe:** B setzt LOCKED auf RELEASED, hält die Transaktion offen. A darf keine vorzeitige Freigabe erhalten. Nach B-COMMIT nur für berechtigten Erben.
5. **Negativfälle:** fremder Erbe, Eigentümer, gefälschte verifizierte UUID, nicht bestätigte Identität, CANCELLED/REVOKED, fehlender Umschlag, SQL-Fehler, Timeout und Verbindungsabbruch.
6. **Rechte und Hijacking:** Tabellen-SELECT/UPDATE/DELETE/INSERT für Serverrolle müssen scheitern. `EXECUTE` für PUBLIC/anon/authenticated/service_role muss scheitern. `search_path`-Manipulation und temp/public-Shadowing prüfen.
7. Testinstanz vollständig entsorgen. **Keine Datenbank- oder Rollenkonfiguration auf produktiven Systemen** verändern.

## Grenzen

- `FOR SHARE` erfordert für den Funktionseigentümer passende UPDATE-Berechtigungen auf gesperrten Tabellen, nicht für den Aufrufer. Diese Rechte müssen gegen RLS und Eigentümerschaft geprüft werden.
- `CREATE OR REPLACE FUNCTION` kann vorhandene EXECUTE-Rechte beibehalten; der Entwurf verwendet nur CREATE FUNCTION.
- `SECURITY DEFINER` führt mit Eigentümerprivilegien aus. Tabelleneigentümer umgehen RLS in der Regel, sofern FORCE RLS nicht gilt; BYPASSRLS-Rollen umgehen RLS grundsätzlich.
- Die Funktion authentifiziert ihren UUID-Parameter nicht selbst. Keine direkte Browser-/RPC-Freigabe.
- Sperren gelten nur bis zum Transaktionsende. Bereits ausgegebene Ciphertexte lassen sich nicht nachträglich zurückrufen.
- **Kein echter Paralleltest durchgeführt:** Dies ist ausschließlich ein Prüfplan.

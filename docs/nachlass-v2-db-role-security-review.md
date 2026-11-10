# Nachlass v2: eingeschränkte Datenbankrolle (Entwurf, NICHT ausführen)

Die Erben-API darf niemals den Supabase-`service_role`-Schlüssel im Browser oder in Client-JavaScript verwenden. `service_role` umgeht RLS; die aktuelle SQL-Repository-Abfrage muss deshalb durch **separat geprüfte Serverberechtigungen** abgesichert werden.

## Geplante Vertrauensgrenze

1. Ein dedizierter Serverprozess validiert den Bearer mit `supabase.auth.getUser(token)`.
2. Der Server übernimmt ausschließlich die verifizierte `user.id`, niemals `user_metadata`, Client-Rollen oder eine vom Aufrufer angegebene Erben-ID.
3. Eine eigene Datenbankverbindung liest `nachlass_v2.vaults`, `nachlass_v2.heir_memberships` und `nachlass_v2.heir_envelopes` mittels einer parametrisierten, zeilensperrenden Transaktion.
4. BLOCKER: PostgreSQL verlangt für `SELECT ... FOR SHARE` zusätzlich `UPDATE` auf mindestens einer Spalte **jeder gesperrten Tabelle**. Eine reine SELECT-Rolle kann die aktuelle Abfrage daher nicht ausführen. Keine pauschalen UPDATE-Rechte vergeben. Bis zu einem isoliert getesteten, eng begrenzten Privilegienmodell bleibt die Integration deaktiviert. Keine Rechte auf `public.vault_cloud_snapshots`, `auth.users`, andere Schemata oder allgemeine Rollenmitgliedschaft.
5. Weil das Erben-Schema bewusst keine Erben-RLS-Policies enthält, muss ein Zugriffspfad mit RLS-Bypass ausdrücklich und separat auditiert werden. `BYPASSRLS` ist eine weitreichende Rollenfähigkeit, selbst wenn Tabellenrechte beschränkt werden. Eine sichere Alternative ist eine streng geprüfte, transaktionale `SECURITY DEFINER`-Funktion mit festem `search_path`, ohne dynamisches SQL und mit ausschließlich enger `EXECUTE`-Berechtigung. **Keine der beiden Varianten ist freigegeben.**

## Pflichtprüfungen vor jeder Aktivierung

- Nichtproduktive PostgreSQL-Tests mit zwei unabhängigen Verbindungen: Widerruf vor, während und nach dem `FOR SHARE`-Lesevorgang; Nachweis des gewünschten Sperr- und Sichtbarkeitsverhaltens.
- Nachweis, dass die dedizierte Rolle keine DML-Rechte, keine DDL-Rechte, keine ungewollten Standardprivilegien und keinen Zugriff auf andere Tabellen hat.
- Prüfung von Verbindungs-Pooling, Transaktionsgrenzen, SQL-Fehlern, Timeouts und Audit-Logs.
- Prüfung von Erben-Zuordnung, Freigabezustand, Widerruf und Rückgabe ausschließlich des passenden verschlüsselten Umschlags.
- **Keine produktive Migration, keine produktive Testdatenanlage und keine Aktivierung** ohne gesonderte Freigabe.

Die aktuelle Komposition `heir-handler-v2.cjs` ist ausschließlich eine injizierbare Serverbibliothek; sie startet keinen Endpunkt und erstellt keine Datenbankverbindung.

## Nachgewiesener Berechtigungsblocker (2026-11-10)

Die PostgreSQL-Dokumentation bestätigt: `SELECT ... FOR SHARE` benötigt zusätzlich zu `SELECT` das `UPDATE`-Privileg auf mindestens einer Spalte jeder gesperrten Tabelle. Quelle: https://www.postgresql.org/docs/current/ddl-priv.html . Die bisherige SELECT-only-Rolle ist mit `FOR SHARE OF v, m, e` nicht kompatibel. Eine UPDATE-Berechtigung würde den Angriffsraum vergrößern und darf nicht als schneller Workaround gewährt werden. Bis zur geprüften Alternative bleiben Server-Endpunkt und Datenbankrolle **nicht aktiviert**. Ein PostgreSQL-Paralleltest wurde noch nicht durchgeführt.

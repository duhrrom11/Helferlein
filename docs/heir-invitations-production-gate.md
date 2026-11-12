# Erbeneinladungen – Produktionsfreigabe (NO-GO bis Abnahme)

Stand: 2026-11-12. Diese Datei dokumentiert nur die Vorbereitung; keine Migration, kein Test und kein Deployment wurde durch diese Dokumentation ausgelöst.

## Reihenfolge und Abhängigkeiten

1. Produktives Schema read-only abgleichen: `public.vault_cloud_snapshots(owner_user_id)` als UUID-Primärschlüssel, `auth.users(id)`, existierende Objekte im Schema `nachlass_private`, bestehende gleichnamige RPCs und Migrationshistorie. Die erste Migration verwendet bewusst `CREATE SCHEMA` und bricht bei Konflikt ab.
2. Separat genehmigt: `supabase/migrations/20261112070000_heir_invitations_private_schema.sql`.
3. Separat genehmigt: `supabase/migrations/20261112070001_heir_invitations_issue_revoke.sql`.
4. Effektive Rechte und Funktionseigentümer nach der Migration prüfen: `SECURITY DEFINER`-RPCs nur für `service_role` ausführbar, keine Rechte für `PUBLIC`, `anon`, `authenticated`; RLS beider privaten Tabellen aktiv, private Schemazugriffe ausgeschlossen. Funktionen dürfen nur von einem vertrauenswürdigen privilegierten Migrationsinhaber erstellt werden.
5. Edge Functions mit `verify_jwt = true` bereitstellen, aber serverseitige Opt-ins nicht aktivieren. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ausschließlich im vorgesehenen Serverkontext konfigurieren; niemals Schlüssel in GitHub ablegen.
6. Separat genehmigte technische Abnahme: JWT-Prüfung, abgelaufene/fremde/widerrufene Token, parallele Ausstellung/Einlösung/Widerruf, fehlende Berechtigungen, Datenbankfehler und sichere Fehlermeldungen.
7. Erst nach Abnahme separat freigeben: `HEIR_INVITATIONS_ENABLED=true` und `HEIR_REDEMPTION_ENABLED=true`. Frontend `BACKEND_APPROVED=false` bis zum letzten gesonderten Freigabeschritt beibehalten.

## Sperr- und Widerrufskonzept

Die RPCs verwenden die Reihenfolge Eigentümerzeile (`FOR UPDATE`) vor Einladungszeile (`FOR UPDATE`). Die Einlösung liest die Eigentümer-ID zunächst ohne Sperre und validiert nach beiden Sperren den vollständigen Einladungszustand erneut. Der Widerruf markiert auch bereits angenommene Zuordnungen als widerrufen. Eine bereits widerrufene Zuordnung blockiert bewusst eine neue Einladung für dasselbe Paar. Kein Erbenzugriff auf Tresordaten wird eingerichtet.

## Verbleibende Risiken und Stoppschalter

- **NO-GO**, solange produktive Rollenrechte, Funktionsinhaberschaft und bestehende Objekte nicht geprüft sind.
- **NO-GO**, solange Parallelitäts- und Fehlerfälle nicht kontrolliert abgenommen wurden. Eine einheitliche Sperrreihenfolge allein garantiert keine Deadlock-Freiheit mit fremden Tabellenoperationen oder FK-Triggern.
- **NO-GO**, solange Rate-Limiting, Missbrauchserkennung, sichere Protokollierung ohne Token, Alarmierung und Wiederherstellungsplan nicht freigegeben sind.
- Bei Problemen: beide serverseitigen Opt-ins deaktiviert lassen bzw. zurücksetzen; Frontend gesperrt lassen. Datenbankmigrationen nicht unüberlegt rückgängig machen, da Löschungen angenommene Einladungen und Zuordnungen verlieren könnten. Vor jeder Rückmigration Sicherung, Abhängigkeiten und Datenfolgen prüfen.
- Keine produktiven Testdatensätze. Eine spätere technische Abnahme benötigt eine gesonderte Freigabe und ein geeignetes isoliertes Verfahren.

## Freigabestatus

**NO-GO** bis die obigen Nachweise vorliegen und eine ausdrückliche produktive Freigabe erteilt wurde.

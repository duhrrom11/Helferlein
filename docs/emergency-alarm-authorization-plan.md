# Helferlein – Notfallalarm: Berechtigungsmodell (Entwurf, nur Test)

Stand: 2026-11-07. **Keine Aktivierung, keine Migration und keine Freigabe von Nachlassdaten.**

## Ausgangslage
Die bestehende Seite `tools/notizen/erben.html` liest `vaults/{vaultId}` direkt aus dem produktiven Firebase und schreibt `emergencyTriggers.{personKey}` aus dem Browser. `personKey` stammt aus der URL. Danach versucht der Browser über EmailJS eine E-Mail zu versenden. Die Seite bewertet die 24-Stunden-Frist selbst. Die produktiven Firestore-Regeln bleiben geschlossen.

## Verbindliche Sicherheitsanforderungen
1. Eine URL mit `vaultId`, `person` oder einem Entschlüsselungsschlüssel ist **kein Nachweis einer Alarmberechtigung**.
2. Ein Alarm darf nur durch eine **serverseitig verifizierte**, explizit für genau diesen Tresor berechtigte Vertrauensperson ausgelöst werden. Die Eigentümer-Zuordnung `vault_ownership` allein beweist keine Vertrauenspersonen-Berechtigung.
3. Berechtigungen müssen vor jedem Zustandswechsel geprüft werden; keine vom Browser gelieferten Eigentümer-IDs, Rollen oder Zeitstempel vertrauen.
4. Alarmstatus, Auslösezeit und Ablaufzeit werden serverseitig und transaktional festgelegt; wiederholte Aufrufe müssen idempotent bzw. begrenzt sein.
5. Die 24-Stunden-Frist ist **keine automatische Entschlüsselungsberechtigung**. Datenzugriff erfordert eine separate, überprüfte Freigabeentscheidung.
6. E-Mail-Versand erfolgt erst später serverseitig, mit Missbrauchsschutz und ohne geheime Zugangsdaten im Browser.
7. Keine Auskunft über fremde Tresore oder Personen; Audit-Ereignisse ohne Geheimnisse oder Klartext-Nachlassdaten.
8. Keine Firebase-Admin-Schlüssel, keine Änderung der produktiven Firebase-Regeln, keine kostenpflichtige Infrastruktur.

## Offene Architekturentscheidung
Vor dem Implementieren einer Alarm-API muss ein sicheres Verfahren für die Identität einer Vertrauensperson festgelegt werden (z. B. eigene authentifizierte Identität plus serverseitig bestätigte Einladung). Ein bloßer Link oder ein `personKey` aus der URL reicht nicht. Die bestehende Test-Tabelle `vault_ownership` bleibt unverändert.

## Aktueller technischer Stand
`supabase/functions/emergency-alarm-test/index.ts` ist ein **nicht bereitgestellter**, absichtlich inaktiver Entwurf: POST liefert ausschließlich HTTP 503 `not_configured`. Keine Datenbankzugriffe, keine E-Mails, keine Alarme.

## Freigabekriterien vor einer späteren Aktivierung
- Identitäts- und Einladungsverfahren dokumentiert und geprüft.
- Negativtests: unberechtigte, widerrufene, fremde und wiederholte Anfragen.
- Serverzeit, Transaktionen, Rate Limits und Audit geprüft.
- Getrennte Freigabe der Datenzugriffsfunktion; keine automatische Öffnung nach 24 Stunden.
- Tests nur mit synthetischen Daten in isolierter Umgebung.

## Einladung von Vertrauenspersonen – geplantes Protokoll

**Status: nur Entwurf; keine Einladung versenden und keine Tabellen anlegen.**

1. Der Tresorinhaber meldet sich an. Der Server prüft seine Eigentümerschaft anhand `vault_ownership` und erzeugt eine Einladung für genau einen Tresor und eine vorgesehene Vertrauensperson. Der Browser darf keine Eigentümerrolle behaupten.
2. Der Server erzeugt ein kryptografisch zufälliges, einmalig einlösbares Einladungstoken mit kurzer Ablaufzeit. In der Datenbank wird ausschließlich ein sicherer Token-Hash gespeichert. Das Token wird weder geloggt noch als dauerhafter URL-Parameter verwendet.
3. Die eingeladene Person meldet sich mit einem **eigenen** Supabase-Testkonto an. Die Einladung wird erst nach serverseitiger Prüfung des Tokens, des Ablaufs und der vorgesehenen Identität angenommen. Die Annahme erfolgt atomar und nur einmal.
4. Der Server hinterlegt die Beziehung `vault_id` + `trusted_user_id` mit Status `active`; Widerruf durch den Eigentümer setzt `revoked`. Jede spätere Alarmanfrage prüft diese Beziehung erneut.
5. Ein Alarm-Endpunkt akzeptiert keine `owner_user_id`, `personKey`-Rolle oder clientseitige Auslösezeit als Autorisierung. Er ermittelt den Benutzer aus einem verifizierten Auth-Token und prüft die aktive Zuordnung auf dem Server.
6. Mehrfache Alarmversuche, widerrufene Einladungen und fremde Tresore werden ohne Datenfreigabe abgewiesen; Missbrauchsschutz und Audit sind vor Aktivierung erforderlich.

### Datenmodell als Konzept, nicht als SQL-Migration
- `trusted_person_invitations`: zufällige Einladungs-ID, `vault_id`, Hash des Einmal-Tokens, vorgesehene Identität, `expires_at`, `accepted_at`, `revoked_at`, serverseitige Zeitstempel.
- `vault_trusted_persons`: `vault_id`, `trusted_user_id`, `status`, serverseitige Zeitstempel, eindeutige Kombination aus Tresor und Benutzer.
- Beide Tabellen benötigen restriktive RLS-/SQL-Rechte; administrative Schreibzugriffe ausschließlich über eng begrenzte serverseitige Funktionen.

### Noch zu entscheiden
- Wie die vorgesehene Identität zuverlässig bestätigt wird, ohne E-Mail-Adressen als alleinigen Eigentums- oder Berechtigungsnachweis zu verwenden.
- Wie Einladungen zugestellt werden, ohne echte Nachrichten im Test auszulösen.
- Wie Einladungslinks gegen Weitergabe, Protokollierung und Referrer-Lecks geschützt werden.
- Wie ein Eigentümer einen Alarm bestätigt, zurückweist oder eine Vertrauensperson widerruft.

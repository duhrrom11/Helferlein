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

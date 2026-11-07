# Helferlein – Technischer Umsetzungsplan Notfallalarm (Staging)

Stand: 2026-11-07. **Plan, keine Freigabe zur Bereitstellung.** Produktion bleibt unverändert.

## Ziel und Grenzen
Der Alarm darf nur von einer angemeldeten, für genau einen Tresor autorisierten Vertrauensperson ausgelöst werden. Die 24-Stunden-Frist und der Alarmzustand sind serverseitig; **keine automatische Datenfreigabe**. Bestehende produktive Firestore-Regeln bleiben geschlossen. Keine Firebase-Admin-Anbindung, keine echten E-Mails und keine kostenpflichtigen Dienste.

## Phase A – Datenbank und Authentifizierung (nur isoliertes Staging)
1. Migrationen für `trusted_person_invitations` und `vault_trusted_persons` als überprüfbare SQL-Dateien vorbereiten; RLS an, Rechte für `anon`/`authenticated` standardmäßig entzogen, keine direkten Policies.
2. Vor dem Ausführen die Identitätsbindung klären: vorhandene Supabase-Testkonto-UID, vom Eigentümer unabhängig bestätigt. E-Mail/URL-Parameter genügen nicht.
3. Serverseitige Endpunkte für Erstellen, Annehmen und Widerrufen mit `auth.getUser`, Eigentümerprüfung über `vault_ownership`, atomarer Einmalannahme und Audit entwickeln.
4. Vor Aktivierung prüfen: fremdes Konto, fremder Tresor, abgelaufenes/verbrauchtes/widerrufenes Token, Replay und parallele Annahme. Keine Geheimnisse in Logs.

## Phase B – Alarmzustand (nur isoliertes Staging)
1. Separates Modell für Alarmereignisse mit serverseitigen `triggered_at`, `expires_at`, Status und eindeutiger Idempotenzregel definieren.
2. `emergency-alarm-test` erst nach Freigabe der Phase A erweitern: aktive Vertrauensperson vor **jedem** Aufruf prüfen; Rate Limit, Audit, neutrale Fehlerantworten.
3. Die 24-Stunden-Frist nur serverseitig prüfen. Ablauf allein erlaubt weder Entschlüsselung noch Abruf von Nachlassdaten.
4. Ausschließlich synthetische Tresore, keine realen Alarme oder E-Mails.

## Phase C – Separater Datenzugriff (nicht Bestandteil dieses Plans)
Eigenes Berechtigungs- und Freigabeverfahren sowie getrennte Sicherheitsprüfung erforderlich. Keine Verbindung zu produktivem Firebase, bevor die Architektur ausdrücklich freigegeben wurde.

## Minimale Prüfschritte statt langer Testreihen
- Ein automatisierter, kurzer Negativtest-Satz pro Phase (fehlende Anmeldung, fremdes Konto, widerrufen, Replay, Frist).
- Nur ein abschließender manueller Staging-Smoke-Test je aktivierter Phase.
- Bei Fehlschlag: geschlossen bleiben; kein produktiver Fallback.

## Bereits vorhanden
- `docs/emergency-alarm-authorization-plan.md`
- `docs/emergency-alarm-data-model.md`
- `docs/emergency-alarm-invitation-lifecycle.md`
- `docs/emergency-alarm-identity-verification.md`
- `supabase/functions/trusted-person-invite-test/index.ts` (inaktiver 503-Platzhalter)
- `supabase/functions/emergency-alarm-test/index.ts` (inaktiver 503-Platzhalter)

## Nächster konkreter Code-Schritt
**Phase A.1:** SQL-Migration als Datei im Repository vorbereiten, **nicht ausführen**. Vor einer Anwendung separat prüfen, dass sie ausschließlich das isolierte Staging betrifft.

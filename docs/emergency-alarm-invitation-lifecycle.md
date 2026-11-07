# Helferlein – Annahme und Widerruf von Vertrauenspersonen-Einladungen

**Stand: 2026-11-07. Nur Entwurf. Keine Datenbankänderung, kein Deployment, keine E-Mails.**

## Einladung annehmen
1. Die eingeladene Person meldet sich mit ihrem **eigenen** Testkonto an. Der Server validiert das Auth-Token über Supabase Auth; URL-Parameter wie `person` sind keine Identitätsnachweise.
2. Der Server prüft ein kryptografisch zufälliges, kurzlebiges Einmaltoken anhand seines gespeicherten Hashs. Die vorgesehene Identität muss unabhängig bestätigt sein; eine beliebige E-Mail-Adresse oder der bloße Besitz eines weitergeleiteten Links reicht nicht.
3. In **einer** Datenbanktransaktion werden Einladung, Ablaufzeit, Widerruf, bereits erfolgte Annahme, Eigentümerzuordnung und vorgesehene Identität geprüft. Ein Sperr-/Eindeutigkeitsmechanismus verhindert parallele Doppelannahme.
4. Nur bei vollständigem Erfolg wird die Beziehung `(vault_id, trusted_user_id)` auf `active` gesetzt und die Einladung als verbraucht markiert. Bei Fehlern keine Teiländerung.
5. Antwort enthält weder Einladungstoken noch Tresorinhalt. Token nicht loggen, nicht in dauerhaften URL-Parametern oder Browser-Speicher halten; Referrer-Lecks verhindern.

## Einladung widerrufen
1. Der angemeldete Eigentümer fordert den Widerruf an. Der Server prüft seine aktuelle Eigentümerschaft für den betreffenden Tresor.
2. Eine offene Einladung wird serverseitig auf `revoked_at` gesetzt. Eine angenommene Berechtigung wird in `vault_trusted_persons` auf `revoked` gesetzt.
3. Der Alarm-Endpunkt muss bei **jedem** Aufruf den aktuellen Berechtigungsstatus neu prüfen. Widerruf gilt auch für bereits zuvor ausgestellte Links.
4. Bei konkurrierenden Annahme- und Widerrufsvorgängen muss die Datenbank eine eindeutige Reihenfolge garantieren; nach erfolgreichem Widerruf darf keine neue aktive Berechtigung aus derselben Einladung entstehen.

## Fehler- und Missbrauchsschutz
- Unbekannte, fremde, abgelaufene, verbrauchte oder widerrufene Einladungen: keine Freigabe, keine Existenzbestätigung.
- Begrenzung von Versuchen und Einladungen je Nutzer/Tresor, sichere Audit-Ereignisse ohne Tokens und Nachlassdaten.
- Eindeutige, serverseitige Zeitstempel; keine clientseitigen Rollen oder Zeitangaben übernehmen.
- Testfälle vor Aktivierung: gültige Annahme, falsches Konto, Replay, Ablauf, Widerruf, parallele Anfragen, fremder Tresor.
- Der genaue Identitätsnachweis und die sichere Zustellung sind **noch offen** und müssen vor einer Implementierung entschieden werden.

## Unverändert
`supabase/functions/trusted-person-invite-test/index.ts` bleibt ein inaktiver 503-Platzhalter. Produktive Firebase-Regeln, Erbenportal und Supabase-Datenbank bleiben unverändert. Einladungsannahme bedeutet **keine** automatische Freigabe von Nachlassdaten.

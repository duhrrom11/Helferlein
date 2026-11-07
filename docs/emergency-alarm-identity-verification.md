# Helferlein – Identitätsprüfung für Vertrauenspersonen (Entscheidungsvorschlag)

Stand: 2026-11-07. **Nur Konzept; keine Bereitstellung, keine Nutzeranlage, keine E-Mails.**

## Empfohlenes Verfahren für die isolierte Testumgebung
1. Jede Vertrauensperson benötigt ein **eigenes, angemeldetes Supabase-Testkonto**. Der Server bestimmt die Identität ausschließlich über `auth.getUser` anhand des verifizierten Zugangstokens.
2. Für die erste Version wird die Vertrauensperson **vor der Einladung anhand ihrer bestehenden Testkonto-UID** ausgewählt. Der Tresoreigentümer muss die UID der vorgesehenen Person über einen vertrauenswürdigen, unabhängigen Weg bestätigen. Eine vom Browser behauptete UID, ein angezeigter Name oder eine E-Mail-Adresse ist **kein Identitätsnachweis**.
3. Der Server verifiziert vor dem Ausstellen der Einladung die Eigentümerschaft des Ausstellers und bindet die Einladung an `vault_id` und die bereits festgelegte `intended_user_id`. Nur dieses angemeldete Konto darf die Einladung einmalig annehmen.
4. Bei der Annahme müssen gültiges Einmaltoken, Ablauf, Widerruf, Einmaligkeit und **exakte Übereinstimmung** zwischen `auth.getUser().id` und `intended_user_id` atomar geprüft werden.
5. Ein aktiver Eintrag in `vault_trusted_persons` entsteht erst nach erfolgreicher Annahme. Jede Alarmanfrage prüft den aktuellen Status erneut. Der Tresorinhaber kann die Zuordnung widerrufen.

## Grenzen und offene Fragen
- Eine Konto-UID beweist die Kontrolle über ein Testkonto, **nicht die bürgerliche Identität** der Person. Die sichere Zuordnung der realen Vertrauensperson zum Konto muss vor einer produktiven Einführung separat geklärt werden.
- Der bloße Besitz eines Links, die URL-Parameter `person` oder `vaultId`, ein E-Mail-Feld und ein Entschlüsselungsschlüssel berechtigen **nicht** zur Alarmauslösung.
- Keine öffentliche Kontosuche oder Offenlegung, ob eine UID existiert; Einladungszustellung im Test ausschließlich ohne echten Versand.
- Vor produktivem Einsatz: verifizierter Einladungs- und Zustellkanal, Schutz bei Kontoübernahme, Recovery-/Kontowechsel-Verfahren, Missbrauchsschutz und Datenschutzprüfung.
- Supabase Auth, RLS und Transaktionen sind vor Aktivierung separat zu implementieren und zu prüfen.

## Nächste technische Arbeit
Eine **nicht bereitgestellte** API-Skizze kann die Eingaben und Fehlerfälle dokumentieren. Sie darf erst nach Datenmodell, Auth-Prüfung, Widerrufsprüfung und Sicherheitsreview von HTTP 503 auf echte Funktionalität umgestellt werden.

Produktives Firebase, `erben.html`, Testdatenbank und vorhandene Platzhalter bleiben unverändert.

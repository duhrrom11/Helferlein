# Schritt 3.59 – Relationale Integrität der Einladungen (Review)

**Nur Dokumentation, keine Migration, nicht ausführen.** Der bisherige SQL-Entwurf bleibt unverändert.

## Gefundene Lücke

Die bestehende Fremdschlüsselbeziehung `vault_trusted_persons.invitation_id -> trusted_person_invitations.invitation_id` belegt lediglich, dass eine Einladung existiert. Sie garantiert **nicht**, dass `vault_id` und `trusted_user_id` zur Einladung passen. Dadurch wäre eine inkonsistente Zuordnung denkbar, falls eine fehlerhafte privilegierte Schreiboperation erfolgt.

## Geplante zusätzliche Datenbank-Constraints

1. Auf `trusted_person_invitations` einen eindeutigen zusammengesetzten Schlüssel für `(invitation_id, vault_id, intended_user_id)` definieren.
2. In `vault_trusted_persons` einen zusammengesetzten Fremdschlüssel `(invitation_id, vault_id, trusted_user_id)` auf genau diese drei Einladungsspalten verwenden. Damit kann eine Zuordnung nicht auf einen anderen Tresor oder Benutzer zeigen.
3. `accepted_by_user_id` und `accepted_at` müssen zusammen gesetzt oder beide NULL sein (bereits als CHECK geplant); die Zuordnung darf nur nach erfolgreicher Annahme entstehen. **Letzteres ist nicht allein durch den zusammengesetzten FK gesichert.** Es braucht eine kontrollierte Transaktionsfunktion und ggf. zusätzliche Trigger/Constraints.
4. Die Eigentümerschaft aus `vault_ownership` muss bei Erstellung und Annahme serverseitig neu geprüft werden. Eigentümerwechsel/Widerruf benötigen abgestimmte Sperren; ein FK allein reicht nicht.
5. Eindeutigkeiten `token_hash`, `(vault_id, trusted_user_id)` und `invitation_id` beibehalten. Widerrufene Zuordnungen nicht durch Upsert automatisch reaktivieren.

## Sicherheits- und Migrationsprüfung

- Alle Schreiboperationen ausschließlich durch einen streng autorisierten Serverpfad, nicht durch Browserrollen; RLS und `REVOKE` beibehalten.
- Vor jeder SQL-Änderung Staging-Schema und Datenbankversion prüfen, inklusive Typen, Indizes, Referenzaktionen und Sperrreihenfolge.
- Synthetische Negativtests: fremder Tresor, falscher Benutzer, nicht angenommene Einladung, Widerruf, doppelte Zuordnung und gleichzeitige Annahme.
- Transaktionsfunktion, Rollenrechte und Rollback separat prüfen; noch **keine** Freigabe zum Deployen.

**Ergebnis:** Die notwendigen relationalen Invarianten sind spezifiziert, aber noch nicht implementiert oder getestet.

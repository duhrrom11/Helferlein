# Helferlein – Datenmodell für Vertrauenspersonen (Entwurf)

Stand: 2026-11-07. **Nur Dokumentation – nicht ausführen, nicht bereitstellen.**

## Ziel
Vertrauenspersonen werden erst nach authentifizierter, einmaliger Annahme einer vom verifizierten Tresoreigentümer ausgestellten Einladung berechtigt. `vault_ownership` ist die einzige vorhandene Test-Eigentümerquelle; sie wird **nicht verändert**. Ein `person`-Parameter aus `erben.html` ist keine Identität.

## Geplante Tabellen (keine Migration)
### `trusted_person_invitations`
- `invitation_id`: zufällige UUID, Primärschlüssel
- `vault_id`: Referenz auf geprüften Testtresor
- `invited_by_user_id`: Eigentümer-UID, serverseitig aus Auth und Eigentümerprüfung
- `intended_user_id`: optional, falls ein bereits bestätigtes Testkonto vorgesehen ist; **niemals allein aus einer unbestätigten E-Mail ableiten**
- `token_hash`: Hash eines kryptografisch zufälligen Einmaltokens; Klartexttoken nicht speichern
- `expires_at`: kurze, serverseitig gesetzte Ablaufzeit
- `accepted_by_user_id`, `accepted_at`, `revoked_at`, `created_at`: serverseitig gesetzt
- Token-Hash eindeutig; keine Tokenwerte in Logs oder API-Antworten nach Erstellung

### `vault_trusted_persons`
- `vault_id`: Tresor-ID
- `trusted_user_id`: verifizierte Supabase-Auth-UID
- `status`: `active` oder `revoked`
- `invitation_id`: angenommene Einladung
- `created_at`, `revoked_at`: serverseitig gesetzt
- Eindeutiger Schlüssel (`vault_id`, `trusted_user_id`)

## Zugriffskontrolle
- Beide Tabellen: RLS aktiviert; standardmäßig **keine** direkten SELECT/INSERT/UPDATE/DELETE-Rechte für `anon` oder `authenticated`; keine Freigabe-Policies.
- Administrative Datenbankzugriffe ausschließlich serverseitig nach `auth.getUser(token)` und erneuter Prüfung von Eigentümerschaft bzw. aktiver Vertrauenspersonen-Zuordnung.
- Einladungen werden in einer Transaktion und atomar genau einmal angenommen; Ablauf, Widerruf, vorgesehene Identität und parallele Annahme prüfen.
- Rückgaben dürfen nicht verraten, ob fremde Tresore oder Einladungen existieren.
- Ratenbegrenzung, Audit ohne Geheimnisse, Token-Hashing und Widerruf vor Aktivierung ergänzen.

## Sicherheitsgrenzen
- Keine Firebase-Verbindung, keine E-Mails, keine Alarmzustände, keine 24-Stunden-Freigabe.
- Das bestehende `emergency-alarm-test` bleibt ein nicht bereitgestellter HTTP-503-Platzhalter.
- Der spätere Alarm ist **nicht** gleichbedeutend mit Nachlassentschlüsselung.
- Vor jeder Migration: Entwurf prüfen, synthetische Daten, negative Tests und explizite Freigabe.

# Atomare Einlösung einer Vertrauenspersonen-Einladung – Sicherheitsentwurf

**Status: REVIEW ONLY. Nicht ausführen, nicht deployen.** Nur für isoliertes Helferlein-Staging. Keine Änderungen an Firebase, Supabase oder Produktion.

## Voraussetzungen (vor Implementierung nachweisen)

- Authentifizierte Supabase-UID ausschließlich serverseitig mit `auth.getUser` verifizieren; niemals eine UID aus Browserparametern vertrauen.
- Token nur als 256-Bit-Zufallswert akzeptieren, SHA-256 serverseitig berechnen; Klartexttoken weder speichern noch protokollieren.
- Verbindliche Zuordnung zu `intended_user_id`; keine Identität aus unbestätigter E-Mail ableiten.
- `vault_ownership` und Tabellenstruktur im isolierten Staging gegen den Entwurf prüfen. Keine Freigabe für `anon`/`authenticated`.
- Autorisierung des serverseitigen Datenbankaufrufs und minimale Berechtigungen unabhängig prüfen. Ein `SECURITY DEFINER`-RPC darf nicht öffentlich ausführbar sein.

## Transaktionsablauf (Pseudocode, absichtlich nicht ausführbar)

1. Transaktion beginnen. Aktuelle Datenbankzeit verwenden, nicht Browserzeit.
2. Einladung anhand des Token-Hashes mit exklusiver Zeilensperre (`SELECT ... FOR UPDATE`) laden. Fehlende oder fremde Einladung nach außen einheitlich ablehnen.
3. Unter derselben Sperre prüfen: noch nicht angenommen, nicht widerrufen, `expires_at >` Datenbankzeit und `intended_user_id =` verifizierte UID.
4. Eigentümerzuordnung für `vault_id` serverseitig erneut prüfen; festlegen, wie ein inzwischen geänderter Eigentümer oder widerrufene Einladungsberechtigung behandelt wird (standardmäßig ablehnen).
5. Zuordnung `vault_trusted_persons` nur für genau denselben Tresor, dieselbe UID und dieselbe Einladung erzeugen; vorhandene oder widerrufene Zuordnungen **nicht** automatisch reaktivieren. Eindeutigkeitsverletzung: gesamte Transaktion zurückrollen.
6. Einladung mit `accepted_by_user_id` und `accepted_at` markieren. Bei Fehler alles zurückrollen; niemals einen Zustand mit akzeptierter Einladung ohne passende Zuordnung committen.
7. Erst nach Commit knappe Erfolgsmeldung ohne Token, Fremd-Tresorinformationen oder vertrauliche Daten zurückgeben.

## Gleichzeitige Anfragen und Fehler

- Zwei parallele Anfragen für dasselbe Token: Die Zeilensperre serialisiert sie; nach Commit der ersten sieht die zweite `accepted_at` und scheitert.
- Token-Ablauf oder Widerruf während einer Anfrage: Widerruf muss dieselbe Zeile unter kompatibler Transaktionssperre aktualisieren; Zustand nach Sperrerwerb erneut prüfen.
- Einzigartigkeit: `token_hash`, `(vault_id, trusted_user_id)` und `invitation_id` per Datenbank-Constraints absichern.
- Eigentümerwechsel, Einladungserstellung, Widerruf und Einlösung benötigen eine konsistente Sperrreihenfolge, um Rennen und Deadlocks zu vermeiden.
- Netzwerk-Timeout nach Commit: keine zweite Einlösung; Wiederholungsversuch darf nicht erneut aktivieren.
- Einheitliche Fehlermeldungen und Ratenbegrenzung gegen Token-Enumeration; Audits nur mit nichtgeheimen Metadaten.

## Offene Prüfungen vor jeder Migration

Der bestehende SQL-Entwurf in `docs/sql-drafts/trusted_persons_staging_DRAFT.sql` erzwingt noch **nicht** alle tabellenübergreifenden Invarianten. Vor Umsetzung: Datenbankfunktion/Transaktionsgrenze, minimale RPC-Rechte, Sperrreihenfolge, RLS, Eigentümerwechsel, bestehende Zuordnungen, Rollback, synthetische Paralleltests und Security Review festlegen.

**Keine Aktivierung, kein Versand, keine Datenfreigabe.**

# Schritt 3.58 – Gleichzeitige Einlösung: Sperr- und Testplan

**Nur Entwurf. Nicht ausführen, nicht deployen.** Kein Zugriff auf Staging- oder Produktivdatenbanken.

## Sicherheitsziel

Wenn zwei Anfragen dasselbe Einladungstoken gleichzeitig einlösen, darf **höchstens eine** erfolgreich sein. Ein reiner TypeScript-Preflight verhindert das nicht, weil beide Anfragen denselben alten Datenstand lesen können.

## Geplante atomare Datenbankoperation

1. Verifizierte Supabase-Benutzeridentität serverseit bestimmen; Token-Hash serverseit bilden. Keine Tokens protokollieren.
2. Transaktion beginnen und Einladung per Token-Hash mit `SELECT ... FOR UPDATE` sperren. Eine zweite Anfrage wartet auf diese Sperre.
3. Nach Erhalt der Sperre mit **Datenbankzeit** erneut prüfen: Einladung nicht angenommen, nicht widerrufen, nicht abgelaufen, für genau diese UID bestimmt.
4. Eigentümerzuordnung und bereits vorhandene Vertrauensperson konsistent innerhalb derselben Transaktion prüfen. Eigentümerwechsel und Widerruf müssen mit abgestimmter Sperrreihenfolge gegen Einlösung serialisiert werden.
5. Neue Vertrauensperson einfügen und Einladung als angenommen markieren. Einzigartige Datenbank-Constraints schützen zusätzlich gegen doppelte Zuordnungen. Bei irgendeinem Fehler vollständiges Rollback.
6. Commit. Erst danach Erfolg ohne Geheimnisse melden. Nachfolgende Versuche sehen die bereits angenommene Einladung und scheitern.

## Späterer automatisierter Paralleltest (isoliertes Staging, synthetische Daten)

- Zwei gleichzeitige Einlösungen desselben Tokens: genau ein Commit, genau eine Zuordnung.
- Zehn gleichzeitige Einlösungen desselben Tokens: weiterhin höchstens ein Commit.
- Zeitgleicher Widerruf: niemals eine Einlösung *nach wirksamem Widerruf*.
- Ablaufzeit exakt am Rand: kein Commit bei `expires_at <=` Datenbankzeit.
- Rollback nach fehlgeschlagenem Einfügen: Einladung bleibt unverändert.
- Wiederholter Request nach Netzwerk-Timeout: keine zweite Aktivierung.
- Eigentümerwechsel und konkurrierende Einlösung: definierte Sperrreihenfolge und fail-closed Ergebnis.

## Noch offene Implementierungsfragen

Der bestehende SQL-Entwurf ist **nicht migrationsbereit**. Vor Umsetzung müssen die Tabellen-Constraints für Tresor/UID/Einladung, Datenbank-RPC-Rechte, Sperrreihenfolge, Transaktionsgrenzen, RLS und Fehlerbehandlung überprüft werden. Kein direkter RPC-Zugriff für Browserrollen, keine Service-Role-Schlüssel im Client.

**Dieser Plan führt keine Paralleltests aus und garantiert noch keine Race-Sicherheit.**

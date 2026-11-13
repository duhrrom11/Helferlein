# Wishlist: Sicherheitsfreigabe und Missbrauchsschutz (Entwurf)

Stand 10.11.2026. **Keine Freigabe, keine produktiven Schreibzugriffe.**

## 1. Live-Bestandsaufnahme (nur SELECT auf Metadaten)
- Vier Tabellen: `wishlist_profiles`, `wishlist_products`, `wishlist_wishes`, `wishlist_follows`; RLS überall aktiviert.
- Anonym: SELECT auf allen vier Tabellen. Authentifiziert: Profile/Wünsche SELECT, INSERT, UPDATE, DELETE; Follows SELECT, INSERT, DELETE; Produkte SELECT, INSERT.
- Schreib-Policies verwenden `auth.uid()` für Eigentümer von Profilen/Wünschen bzw. Follows. Bei Produkten erlaubt die INSERT-Policy jedem angemeldeten Benutzer das Einfügen.
- Alle SELECT-Policies sind `true`: **jede Spalte mit Tabellen-SELECT ist potenziell öffentlich**, nicht nur die expliziten Felder des Frontends.
- Aktuelle Spalten enthalten keine Auth-E-Mail-Adresse. Profilfelder: `user_id,handle,display_name,bio,avatar_url,created_at`. Öffentlich sichtbar sind damit auch UUIDs und `avatar_url` (auch wenn die UI sie nicht anzeigt).
- Supabase Advisor: `auth_leaked_password_protection` deaktiviert. Dashboard-Einstellung gesondert prüfen.

## 2. Verbindlicher Abuse-Schutz vor Launch
1. **Kein rein clientseitiges Rate Limit als Sicherheitsmaßnahme**: Browser und API können umgangen werden.
2. Schreibpfade für `wishlist_products`, `wishlist_wishes`, `wishlist_profiles` und `wishlist_follows` inventarisieren. Für jeden Pfad Benutzeridentität, Burst- und Tageslimit sowie Fehlerrückgabe definieren.
3. Serverseitige Durchsetzung über einen authentifizierten, transaktionalen RPC- oder Edge-Function-Pfad entwerfen; direkte Tabellen-INSERTs erst nach funktionsgleichem Ersatz entziehen. `SECURITY DEFINER` nur nach gesondertem Rechte-/search_path-Review und restriktivem EXECUTE.
4. Für Produkte Deduplizierung nach `(marketplace,asin)` beibehalten. Race Conditions und Unique-Fehler gesondert prüfen; nicht jede Fehlerklasse als Duplikat behandeln.
5. Rate-Limit-Zähler gegen parallele Requests absichern; keine bloße SELECT-COUNT-THEN-INSERT-Prüfung ohne Sperre/Transaktion.
6. Datenschutz: IP-/Gerätekennungen nicht ohne Zweck, Aufbewahrungsfrist und Rechtsgrundlage speichern. Missbrauchslogs minimieren.
7. Rollback und Backups prüfen. Erst dann separat freigegebene Migration; **keine Schemaänderung in diesem Schritt**.

## 3. Datenschutz und öffentliche Daten
- Prüfen, ob `avatar_url` und Nutzer-UUIDs absichtlich öffentlich sein sollen; eine öffentliche SELECT-Policy schränkt keine Spalten ein.
- Falls Spalten vertraulich werden sollen: eigene öffentliche `security_invoker`-View oder differenzierte Spaltenberechtigungen und darauf abgestimmte Frontend-Abfragen planen; nicht ohne Kompatibilitätsprüfung ändern.
- Profilsuche, Feed und Follow-Anzeige auf Datenminimierung prüfen; keine Auth-E-Mails, Tokens oder Service-Role-Schlüssel im Browser.
- Melden/Moderieren benötigt eigene Rollen, RLS und überprüfbaren Prozess; lokales Ausblenden ist keine Meldung.

## 4. Qualitäts-Gates
- Node-Syntax-/Unit-Tests und GitHub Actions **für den jeweils aktuellen Head** nachweisen.
- Browser: Anmeldung, Abmeldung, Profilwechsel, Suchfehler, langsame Antworten, Pagination, Ausblenden/Undo, mobile Bedienung.
- RLS-Negativtests ausschließlich in einer autorisierten isolierten Prüfumgebung oder mit explizit genehmigten bestehenden Konten; keine künstlichen Produktivdatensätze.
- Auth-Konfiguration, Impressum, Datenschutz, Affiliate-Hinweise und Moderationsweg prüfen.
- PR bleibt Draft; kein Merge/Deployment bis alle Gates dokumentiert bestanden sind.

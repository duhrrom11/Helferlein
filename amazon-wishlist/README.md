# Amazon-Wunschlisten – isolierte Grundlage

Status: **Entwicklungsentwurf**, noch nicht in Helferlein eingebunden oder produktiv.

## Architektur
- Nur Amazon-Produktlinks. `amazon-links.mjs` prüft Domain, Marktplatz und ASIN und baut einen Affiliate-Link mit **explizit konfiguriertem Marktplatz-Tag**.
- Keine automatische Produktsuche, kein Scraping, keine Preis-/Bildversprechen. Produktdaten nur über eine zulässige Quelle; alternativ vom Nutzer manuell ergänzen.
- Geplante getrennte Supabase-Instanz für öffentliche Profile, Produkte, Wünsche, Follows, Collections und moderierte Kommentare.
- RLS: öffentlich lesbare freigegebene Datensätze, Schreiben ausschließlich durch Besitzer; Auth-Identitäten niemals als öffentliche Profildaten exponieren.
- Feed, Trending, Zufall und Wunsch des Tages zunächst auf öffentlichen Wünschen aufbauen. Pagination, Missbrauchsschutz und Moderation vor Freischaltung.
- Keine Verbindung zur bestehenden Helferlein-Produktivdatenbank, kein Deployment, keine Datenmigration.

## Nächste Schritte
1. Separates Supabase-Projekt für Wunschlisten festlegen oder neu anlegen (keines der bestehenden Projekte ohne eindeutige Freigabe verändern).
2. Schema-Migration mit RLS und Policy-Tests in Staging erstellen.
3. UI für URL-Import, manuelle Metadaten, öffentliche Profile und Suche implementieren.
4. Amazon-Partnerkennung pro Marktplatz hinterlegen; Bedingungen des Partnerprogramms prüfen.
5. Tests: `node --test amazon-wishlist/amazon-links.test.mjs`.
6. Nach Review Integration als Helferlein-Tool per separatem PR.

## Datenschutz
Keine persönlichen E-Mails in öffentlichen Profilen. Analytics nur datensparsam und aggregiert. Kommentare benötigen Melden/Löschen/Moderation.

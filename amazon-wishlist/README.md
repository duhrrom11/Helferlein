# Helferlein – öffentliche Amazon-Wunschlisten

## Aktueller Stand (10. November 2026)

Die Wunschlisten-App wird auf `main` entwickelt und über Vercel produktiv bereitgestellt:

- https://helferlein-ochre.vercel.app/amazon-wishlist/index.html
- GitHub: `duhrrom11/Helferlein`, Verzeichnis `amazon-wishlist/`
- Supabase: bestehendes Produktivprojekt `alltagshelfer` (`avapuibsidubuzxjtyld`), Tabellen ausschließlich mit Präfix `wishlist_`
- Amazon.de-Partnerkennung: `duhrrom-21`; keine anderen Amazon-Marktplätze freigeben
- Keine Testdatensätze in der produktiven Datenbank anlegen

## Funktionen

- E-Mail-Registrierung und Anmeldung über Supabase Auth
- Öffentliches Profil (Benutzername, Anzeigename, Beschreibung), Profilsuche und Profil-Link
- Wünsche mit Amazon.de-ASIN, Titel, öffentlicher Notiz und Priorität
- Wünsche hinzufügen, Notiz/Priorität bearbeiten, eigene Wünsche entfernen
- Öffentlicher Feed, Filter auf eigene Wünsche, gefolgte Personen und Profile; Sortierung nach Datum oder Priorität
- Folgen/Entfolgen, Wunsch- und Profil-Links kopieren
- Wünsche oder ganze Profile lokal für die aktuelle Sitzung ausblenden und wieder einblenden
- **Eigene Wünsche exportieren:** CSV für Tabellenprogramme oder JSON mit öffentlichen Profildaten und Wünschen. JSON ist ein Backup-Format. Eine **lokale, schreibgeschützte Vorschau** kann JSON-Sicherungen auf Gültigkeit prüfen und bis zu 30 Wünsche anzeigen. **Ein Import in Supabase ist nicht implementiert.**
- Kein automatischer Abruf von Amazon-Produktdaten; keine Preise oder Verfügbarkeitsangaben

## Datenschutz und Sicherheit

Öffentliche Profilfelder, Wunschtexte und Notizen sind für alle Besucher sichtbar. Bitte keine vertraulichen oder personenbezogenen Angaben Dritter eintragen. Der JSON-Export enthält ausschließlich öffentliche Profildaten und Wunschfelder, keine Authentifizierungs-E-Mail oder interne Konto-IDs. Der CSV-Export schützt beim Öffnen in Tabellenprogrammen vor typischen Formelinjektionen. Die Sicherungsdateien müssen vom Benutzer selbst geschützt werden.

Alle schreibenden Datenbankzugriffe müssen durch RLS auf den angemeldeten Benutzer beschränkt bleiben. Die Client-App nutzt ausschließlich den Supabase-Publishable-Key, keinen Service-Role-Schlüssel.

**Noch nicht fertig:** Serverseitige Rate-Limits/Spam-Schutz, Inhaltsmeldung und Moderation, rechtliche Pflichtseiten, umfassende RLS-Negativtests und echte Browser-End-to-End-Tests. Die vorhandenen Tests ersetzen keine vollständige Produktionsfreigabe.

## Entwicklung und Tests

```bash
node --check amazon-wishlist/app.mjs
node --check amazon-wishlist/amazon-links.mjs
node --check amazon-wishlist/wishlist-utils.mjs
node --test amazon-wishlist/*.test.mjs
```

Die GitHub-Action `.github/workflows/amazon-wishlist.yml` soll die Prüfungen ausführen. Ein erfolgreicher Vercel-Build allein beweist **keinen** erfolgreichen Unit-, RLS- oder Browser-Testlauf. GitHub-Actions-Ergebnisse müssen für den jeweiligen Commit gesondert verifiziert werden.

## Weiterentwicklung

Arbeiten ausschließlich am Wunschlisten-Tool. `main` ist der aktuelle Produktivstand. Die ältere PR #166 ist ein historischer Draft und **nicht** die Quelle für neue Änderungen. Keine anderen Helferlein-Tools bearbeiten. Vor riskanten Schemaänderungen einen RLS-, Backup- und Rollback-Plan prüfen.

Die JSON-Vorschau akzeptiert nur das Format `helferlein-wishlist-backup` in Version 1, prüft ASIN, Priorität, Textlängen, Duplikate und eine maximale Dateigröße von 2 MB. Die ausgewählte Datei wird ausschließlich im Browser gelesen; sie löst keine Datenbankänderung aus. Für echte Wiederherstellung ist ein separates, sicherheitsgeprüftes Importkonzept nötig.\n\nWeitere Aufgaben: `50-SCHRITTE.md`, `RELEASE-CHECKLIST.md`, `SECURITY-ABUSE-PLAN.md`.

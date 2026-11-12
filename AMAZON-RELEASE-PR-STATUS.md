# Amazon-Import – Release-Abgleich (12.11.2026)

Status: **Vorbereitung / NICHT mergefähig**.

## Ausgangslage
- Basis: aktueller `main`; bestehende Nachlass- und sonstige Änderungen bleiben unverändert.
- Lokale Quelle: `Helferlein-Amazon-Release-Betriebsplan-Gesamt.zip` (535 ZIP-Einträge).
- Die ZIP-Dateien sind **noch nicht** in diesen Branch übertragen. Dieser Branch enthält vorerst nur dieses Übergabedokument.
- Die vom Betreiber bestätigte produktive Seite ist `https://duhrrom11.github.io/Helferlein/amazon-wishlist/index.html` (GitHub Pages). Die Origin für die Gateway-CORS-Allowlist ist `https://duhrrom11.github.io`; der Projekt-Unterpfad ist kein Bestandteil der Origin. Die im GitHub-Repository hinterlegte Vercel-Homepage ist für diesen Release nicht maßgeblich.

## Für einen mergefähigen PR noch erforderlich
1. Ausschließlich die Amazon-Import-Dateien aus dem ZIP mit dem aktuellen `main` vergleichen und übernehmen; bestehende Dateien nicht blind überschreiben.
2. Browser-Importer und Frontend-Konfiguration für den sicheren HTTPS-Gateway übernehmen.
3. Gateway-Server, Edge-Function, IP-Guard, Scraper, SQL-Migrationen 01–06 und gezielte Tests unter `amazon-import-integration/` übernehmen.
4. Vor einem Merge prüfen: Backend-Laufzeit mit direktem TLS, Gateway-Origin, Secrets, Edge-Function und SQL-Migrationen. **Kein Produktiv-Deployment**, bevor diese Voraussetzungen bestätigt sind.
5. GitHub-Pages-Projektpfad und absolute HTTPS-Gateway-URL in der produktiven Frontend-Konfiguration berücksichtigen; keine Vercel-Abhängigkeit annehmen.

Keine Änderungen an Supabase, keine Testdaten und kein Deployment im Rahmen dieser Übergabe.

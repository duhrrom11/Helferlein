# Helferlein – statische Livegang-Prüfung

Stand: 2026-11-07. Nur Quellcode-Prüfung; keine Browser-Tests, keine Datenbankzugriffe, keine Testdaten.

## 50 durchgeführte Prüfschritte

| Nr. | Tool | Prüfung | Ergebnis |
|---:|---|---|---|
| 1 | `tools/kassenbon/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 2 | `tools/kassenbon/index.html` | Deutsche Seitensprache | Vorhanden |
| 3 | `tools/kassenbon/index.html` | Mobiler Viewport | Vorhanden |
| 4 | `tools/kassenbon/index.html` | Seitentitel | Vorhanden |
| 5 | `tools/kassenbon/index.html` | Interner Navigationslink | Vorhanden |
| 6 | `tools/kisten/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 7 | `tools/kisten/index.html` | Deutsche Seitensprache | Vorhanden |
| 8 | `tools/kisten/index.html` | Mobiler Viewport | Vorhanden |
| 9 | `tools/kisten/index.html` | Seitentitel | Vorhanden |
| 10 | `tools/kisten/index.html` | Interner Navigationslink | Vorhanden |
| 11 | `tools/wg-kasse/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 12 | `tools/wg-kasse/index.html` | Deutsche Seitensprache | Vorhanden |
| 13 | `tools/wg-kasse/index.html` | Mobiler Viewport | Vorhanden |
| 14 | `tools/wg-kasse/index.html` | Seitentitel | Vorhanden |
| 15 | `tools/wg-kasse/index.html` | Interner Navigationslink | Vorhanden |
| 16 | `tools/notizen/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 17 | `tools/notizen/index.html` | Deutsche Seitensprache | Vorhanden |
| 18 | `tools/notizen/index.html` | Mobiler Viewport | Vorhanden |
| 19 | `tools/notizen/index.html` | Seitentitel | Vorhanden |
| 20 | `tools/notizen/index.html` | Interner Navigationslink | Vorhanden |
| 21 | `tools/kfz/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 22 | `tools/kfz/index.html` | Deutsche Seitensprache | Vorhanden |
| 23 | `tools/kfz/index.html` | Mobiler Viewport | Vorhanden |
| 24 | `tools/kfz/index.html` | Seitentitel | Vorhanden |
| 25 | `tools/kfz/index.html` | Interner Navigationslink | Vorhanden |
| 26 | `tools/haustier/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 27 | `tools/haustier/index.html` | Deutsche Seitensprache | Vorhanden |
| 28 | `tools/haustier/index.html` | Mobiler Viewport | Vorhanden |
| 29 | `tools/haustier/index.html` | Seitentitel | Vorhanden |
| 30 | `tools/haustier/index.html` | Interner Navigationslink | Vorhanden |
| 31 | `tools/parken/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 32 | `tools/parken/index.html` | Deutsche Seitensprache | Vorhanden |
| 33 | `tools/parken/index.html` | Mobiler Viewport | Vorhanden |
| 34 | `tools/parken/index.html` | Seitentitel | Vorhanden |
| 35 | `tools/parken/index.html` | Interner Navigationslink | Vorhanden |
| 36 | `tools/verleih/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 37 | `tools/verleih/index.html` | Deutsche Seitensprache | Vorhanden |
| 38 | `tools/verleih/index.html` | Mobiler Viewport | Vorhanden |
| 39 | `tools/verleih/index.html` | Seitentitel | Vorhanden |
| 40 | `tools/verleih/index.html` | Interner Navigationslink | Vorhanden |
| 41 | `tools/pflanzen/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 42 | `tools/pflanzen/index.html` | Deutsche Seitensprache | Vorhanden |
| 43 | `tools/pflanzen/index.html` | Mobiler Viewport | Vorhanden |
| 44 | `tools/pflanzen/index.html` | Seitentitel | Vorhanden |
| 45 | `tools/pflanzen/index.html` | Interner Navigationslink | Vorhanden |
| 46 | `tools/energie/index.html` | HTML5-Dokumenttyp | Vorhanden |
| 47 | `tools/energie/index.html` | Deutsche Seitensprache | Vorhanden |
| 48 | `tools/energie/index.html` | Mobiler Viewport | Vorhanden |
| 49 | `tools/energie/index.html` | Seitentitel | Vorhanden |
| 50 | `tools/energie/index.html` | Interner Navigationslink | Vorhanden |

## Zusätzlich inspiziertes elftes Tool

`tools/küche/küchenmathe.html`: HTML5, Seitensprache, Viewport, Titel und interner Link vorhanden.

## Sicherheitsbefunde und offene Freigabeschritte

- Im begleitenden Branch behoben: Globale Backups schließen bekannte Supabase- und Firebase-Authentifizierungsschlüssel aus; der Import weist solche Sitzungsschlüssel zurück.
- Offen: Browser-End-to-End-Prüfung aller elf Tools.
- Offen: Digitaler Tresor mit Firebase und Supabase benötigt Prüfung von Berechtigungen, Verschlüsselung und Notfallfunktionen.
- Offen: Rechtliche Freigabe der Datenschutztexte aus PR #6.
- Offen: Bewertung externer JavaScript-CDNs und Ausfallrisiken.
- Hinweis: Früher exportierte Backup-Dateien können weiterhin Sitzungstokens enthalten und müssen sicher behandelt werden.
- Nicht durchgeführt: Datenbankänderungen, Testdatenerstellung, Live-Schaltung.

Ergebnis: 50 statische Prüfungen, 0 fehlende Basiselemente.
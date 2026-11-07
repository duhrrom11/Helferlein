# Helferlein – 50 Sicherheitsprüfungen vor Livegang

Statische Quellcode-Prüfung am 2026-11-07. Keine Browser-Tests, keine Datenbankänderungen.

| Nr. | Tool | Prüfung | Ergebnis |
|---:|---|---|---|
| 1 | tools/kassenbon/index.html | eval-Aufruf | Nicht gefunden |
| 2 | tools/kassenbon/index.html | document.write-Aufruf | Nicht gefunden |
| 3 | tools/kassenbon/index.html | HTTP-Literal | Nicht gefunden |
| 4 | tools/kassenbon/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 5 | tools/kassenbon/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 6 | tools/kisten/index.html | eval-Aufruf | Nicht gefunden |
| 7 | tools/kisten/index.html | document.write-Aufruf | Nicht gefunden |
| 8 | tools/kisten/index.html | HTTP-Literal | Nicht gefunden |
| 9 | tools/kisten/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 10 | tools/kisten/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 11 | tools/wg-kasse/index.html | eval-Aufruf | Nicht gefunden |
| 12 | tools/wg-kasse/index.html | document.write-Aufruf | Nicht gefunden |
| 13 | tools/wg-kasse/index.html | HTTP-Literal | Nicht gefunden |
| 14 | tools/wg-kasse/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 15 | tools/wg-kasse/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 16 | tools/notizen/index.html | eval-Aufruf | Nicht gefunden |
| 17 | tools/notizen/index.html | document.write-Aufruf | Nicht gefunden |
| 18 | tools/notizen/index.html | HTTP-Literal | Gefunden – Kontext prüfen |
| 19 | tools/notizen/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 20 | tools/notizen/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 21 | tools/kfz/index.html | eval-Aufruf | Nicht gefunden |
| 22 | tools/kfz/index.html | document.write-Aufruf | Nicht gefunden |
| 23 | tools/kfz/index.html | HTTP-Literal | Nicht gefunden |
| 24 | tools/kfz/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 25 | tools/kfz/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 26 | tools/haustier/index.html | eval-Aufruf | Nicht gefunden |
| 27 | tools/haustier/index.html | document.write-Aufruf | Nicht gefunden |
| 28 | tools/haustier/index.html | HTTP-Literal | Nicht gefunden |
| 29 | tools/haustier/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 30 | tools/haustier/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 31 | tools/parken/index.html | eval-Aufruf | Nicht gefunden |
| 32 | tools/parken/index.html | document.write-Aufruf | Nicht gefunden |
| 33 | tools/parken/index.html | HTTP-Literal | Nicht gefunden |
| 34 | tools/parken/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 35 | tools/parken/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 36 | tools/verleih/index.html | eval-Aufruf | Nicht gefunden |
| 37 | tools/verleih/index.html | document.write-Aufruf | Nicht gefunden |
| 38 | tools/verleih/index.html | HTTP-Literal | Nicht gefunden |
| 39 | tools/verleih/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 40 | tools/verleih/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 41 | tools/pflanzen/index.html | eval-Aufruf | Nicht gefunden |
| 42 | tools/pflanzen/index.html | document.write-Aufruf | Nicht gefunden |
| 43 | tools/pflanzen/index.html | HTTP-Literal | Nicht gefunden |
| 44 | tools/pflanzen/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 45 | tools/pflanzen/index.html | Externe Script-URL | Gefunden – Kontext prüfen |
| 46 | tools/energie/index.html | eval-Aufruf | Nicht gefunden |
| 47 | tools/energie/index.html | document.write-Aufruf | Nicht gefunden |
| 48 | tools/energie/index.html | HTTP-Literal | Nicht gefunden |
| 49 | tools/energie/index.html | Dynamisches innerHTML | Gefunden – Kontext prüfen |
| 50 | tools/energie/index.html | Externe Script-URL | Gefunden – Kontext prüfen |

## Sicherheitskorrekturen

In Kassenbon, Kisten, KFZ, Haustier und Energie werden Konto-E-Mail-Adressen nun mit textContent statt innerHTML ausgegeben.

## Prioritäten vor Veröffentlichung

- P0: Dynamische HTML-Inhalte auf XSS-Risiken prüfen, insbesondere Verleih, WG-Kasse und Tresor.
- P0: Tresor, Vertrauenspersonen und Firebase-Regeln sicherheitsprüfen.
- P1: Externe JavaScript-Abhängigkeiten prüfen.
- P1: Echte Browser-Funktionsprüfung aller elf Tools durchführen.
- P1: Datenschutztext aus PR #6 fachlich und rechtlich prüfen.

Die Suchtreffer sind Indikatoren, keine bestätigten Sicherheitslücken. 50 Prüfungen; 21 positive Suchtreffer.
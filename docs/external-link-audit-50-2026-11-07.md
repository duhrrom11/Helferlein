# Helferlein – Livegang: 50 Prüfungen externer Links und Scriptquellen

Stand: 2026-11-07. Statische Codeprüfung, keine Laufzeit- oder Browserprüfung.

| Schritt | Tool | Prüfkriterium | Ergebnis |
|---:|---|---|---|
| 1 | `tools/kassenbon/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 2 | `tools/kassenbon/index.html` | Neues Fenster: rel=noreferrer | Offen |
| 3 | `tools/kassenbon/index.html` | Kein eval()-Aufruf | Bestanden |
| 4 | `tools/kassenbon/index.html` | Kein document.write()-Aufruf | Bestanden |
| 5 | `tools/kassenbon/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 6 | `tools/kisten/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 7 | `tools/kisten/index.html` | Neues Fenster: rel=noreferrer | Offen |
| 8 | `tools/kisten/index.html` | Kein eval()-Aufruf | Bestanden |
| 9 | `tools/kisten/index.html` | Kein document.write()-Aufruf | Bestanden |
| 10 | `tools/kisten/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 11 | `tools/wg-kasse/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 12 | `tools/wg-kasse/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 13 | `tools/wg-kasse/index.html` | Kein eval()-Aufruf | Bestanden |
| 14 | `tools/wg-kasse/index.html` | Kein document.write()-Aufruf | Bestanden |
| 15 | `tools/wg-kasse/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 16 | `tools/notizen/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 17 | `tools/notizen/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 18 | `tools/notizen/index.html` | Kein eval()-Aufruf | Bestanden |
| 19 | `tools/notizen/index.html` | Kein document.write()-Aufruf | Bestanden |
| 20 | `tools/notizen/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 21 | `tools/kfz/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 22 | `tools/kfz/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 23 | `tools/kfz/index.html` | Kein eval()-Aufruf | Bestanden |
| 24 | `tools/kfz/index.html` | Kein document.write()-Aufruf | Bestanden |
| 25 | `tools/kfz/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 26 | `tools/haustier/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 27 | `tools/haustier/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 28 | `tools/haustier/index.html` | Kein eval()-Aufruf | Bestanden |
| 29 | `tools/haustier/index.html` | Kein document.write()-Aufruf | Bestanden |
| 30 | `tools/haustier/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 31 | `tools/parken/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 32 | `tools/parken/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 33 | `tools/parken/index.html` | Kein eval()-Aufruf | Bestanden |
| 34 | `tools/parken/index.html` | Kein document.write()-Aufruf | Bestanden |
| 35 | `tools/parken/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 36 | `tools/verleih/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 37 | `tools/verleih/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 38 | `tools/verleih/index.html` | Kein eval()-Aufruf | Bestanden |
| 39 | `tools/verleih/index.html` | Kein document.write()-Aufruf | Bestanden |
| 40 | `tools/verleih/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 41 | `tools/pflanzen/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 42 | `tools/pflanzen/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 43 | `tools/pflanzen/index.html` | Kein eval()-Aufruf | Bestanden |
| 44 | `tools/pflanzen/index.html` | Kein document.write()-Aufruf | Bestanden |
| 45 | `tools/pflanzen/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |
| 46 | `tools/energie/index.html` | Neues Fenster: rel=noopener | Bestanden |
| 47 | `tools/energie/index.html` | Neues Fenster: rel=noreferrer | Bestanden |
| 48 | `tools/energie/index.html` | Kein eval()-Aufruf | Bestanden |
| 49 | `tools/energie/index.html` | Kein document.write()-Aufruf | Bestanden |
| 50 | `tools/energie/index.html` | Keine unverschlüsselten HTTP-Scriptquellen | Bestanden |

## Ergebnis

- 50 statische Prüfungen an zehn produktiven Tools.
- 39 Links mit target=_blank erfasst.
- 2 offene Befunde nach den Codekorrekturen.
- 33 Link-Attribute in acht Tools wurden um noopener/noreferrer ergänzt (aus vorherigem Quellcode-Vergleich).

## Nicht geprüft

- Tatsächliche Erreichbarkeit externer Ziele und JavaScript-Laufzeit.
- Zugriffsrechte und Datenflüsse im Tresor.
- Datenschutzrechtliche Freigabe, vollständige Browser- und mobile Tests.
- Produktive Datenbank oder Nutzerdaten wurden nicht verändert.
# Helferlein Coding-Agent – verbindliche Arbeitsregeln

**Status:** Entwurf. Noch kein autonomer Agent verbunden. Dieser Text ist ein prüfbarer Vertrag für eine spätere, gesondert autorisierte Agent-Laufzeit.

## Ziel und Arbeitsmodus

Ein Agent darf im Nachtfenster 00:00–06:00 Europe/Berlin jeweils eine kleine, nachvollziehbare Entwicklungsaufgabe vorbereiten. Jeder Schritt muss unabhängig überprüfbar sein. Der Agent muss den letzten freigegebenen Stand und die offenen Aufgaben aus versionierten Dateien bzw. einem GitHub-Issue lesen. Er darf nicht auf das automatische Öffnen neuer Chat-Unterhaltungen oder auf den vollständigen privaten Chatverlauf vertrauen.

## Nicht verhandelbare Grenzen

- **Keine direkten Commits auf `main`**, keine automatischen Merges und keine Deployments.
- **Keine Schreibzugriffe auf die produktive Supabase-Datenbank**, keine Testdaten dort, keine Löschung oder Veränderung echter Nutzerdaten.
- Keine produktiven Supabase-Secrets, Service-Role-Keys, Tresorschlüssel, Benutzerpasswörter oder persönlichen Daten im Agent-Kontext, in Logs oder Issues.
- Keine Ausführung von Datenbankmigrationen, Edge-Function-Deployments, Auth- oder RLS-Änderungen gegen Produktivsysteme.
- Änderungen an `supabase/**`, `.github/workflows/**`, Berechtigungen, Auth, Verschlüsselung, Tresoren, Datenlöschung und Release-Konfigurationen werden ausschließlich als Vorschläge behandelt und benötigen ausdrückliche menschliche Prüfung.
- Keine automatisierte Freigabe eines eigenen Pull Requests. Ein grüner CI-Status ersetzt keine menschliche Freigabe.
- Keine unkontrollierte Installation von Paketen, Ausführung fremder Skripte oder Weitergabe von Zugangsdaten.

## Vorgeschlagene technische Architektur

1. **Planer:** Der vorhandene Nachtkoordinator bleibt lesend und verwaltet seinen Fortschritt über GitHub-Issue #167.
2. **Aufgabenquelle:** Ein separates GitHub-Issue mit explizit freigegebenen, begrenzten Entwicklungstickets; keine automatisch aus Chat-Text erfundenen Produktivaufträge.
3. **Agent-Laufzeit:** Separater GitHub-Actions-Job mit vertrauenswürdigem Coding-Agent und explizit eingerichteter Modell-/API-Anbindung. Der Agent erhält nur die für das jeweilige Ticket nötigen Rechte.
4. **Schreibpfad:** Der Agent erstellt Änderungen auf einem dedizierten Branch und eröffnet einen **Draft-Pull-Request**. Für Branch-Schreibzugriff und PR-Erstellung sind separat eingeschränkte Berechtigungen notwendig. Der vorhandene Nachtkoordinator behält `contents: read` und `issues: write`.
5. **Prüfpfad:** Syntax, statische Sicherheitsprüfungen, passende Tests und Review durch eine andere Instanz bzw. einen Menschen.
6. **Freigabe:** Merge nur nach expliziter menschlicher Zustimmung und vorhandenen Branch-Protection-/Ruleset-Regeln.
7. **Übergabe:** Jeder Agent-Lauf hinterlegt Ticket, Branch, PR, Teststatus, offene Fragen und nächsten sicheren Schritt im Aufgaben-Issue.

## Voraussetzungen vor Aktivierung

- Auswahl eines Agent-Anbieters und einer ausführbaren Agent-Laufzeit
- Festlegung eines Kosten-/Tokenlimits pro Nacht
- Sichere Verwaltung der erforderlichen Zugangsdaten als GitHub Actions Secrets
- Prüfung der GitHub-Branch-Protection bzw. Repository-Rulesets
- Eindeutige Definition zulässiger Dateipfade und Kommandos
- Nachweis, dass ein Agent einen Draft-PR erstellen kann, ohne auf `main` zu schreiben
- Menschliche Freigabe des Agent-Workflows und des ersten Tickets

## Beispiel eines sicheren ersten Tickets

**Auftrag:** Verbessere ausschließlich statische Dokumentation zum Nachtbetrieb. Keine Änderung von produktiver Logik, Datenbank, Authentifizierung, Workflows oder Deployment. Erstelle einen Draft-PR mit nachvollziehbarer Änderung und Testbericht.

**Abbruchkriterien:** Unklare Anforderungen, fehlende Rechte, unvorhergesehene Dateiveränderungen, gescheiterte Tests, notwendige Produktivzugriffe oder fehlende Freigabe.

## Statusmeldungen

Morgenberichte müssen unterscheiden zwischen **Prüfungen ausgeführt**, **Änderungen als Draft-PR vorgeschlagen**, **vom Menschen freigegeben** und **in Produktion ausgerollt**. Keine dieser Kategorien darf aus einer anderen abgeleitet werden.

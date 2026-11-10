# Helferlein Nachtschicht – ausschließlich Wunschlisten

Stand: 10.11.2026

## Verbindlicher Arbeitsumfang

Die automatische Nachtschicht untersucht **ausschließlich** das Wunschlisten-Tool unter `amazon-wishlist/`. Die vier rotierenden Prüfungen im Skript `scripts/night-coordinator.cjs` sind:

1. Syntax der Wunschlisten-JavaScriptmodule.
2. Lokale Unit- und Sicherheits-Regressionstests der Wunschliste.
3. Statische Prüfung von öffentlicher Darstellung, Partnerlink-Schutz und gefährlichen Schlüsseln.
4. Inventur der offenen Wunschlisten-Aufgaben.

**Ausgeschlossen:** Haushaltsbuch, WG-Organisator, Tresor, Pflanzenpflege, Zählerstände, allgemeine Supabase-Migrationen und sämtliche anderen Helferlein-Tools. Die früheren allgemeinen Nachtschichtprüfungen wurden aus dem aktiven Aufgabenpool entfernt.

## Betrieb

Der Workflow `.github/workflows/night-coordinator.yml` startet laut GitHub-Zeitplan alle fünf Minuten, sofern GitHub Actions ihn ausführt. Um 06:00 Uhr Berliner Zeit oder beim nächsten planmäßigen Lauf wird ein Morgenbericht in einem GitHub-Issue veröffentlicht. Die Nachtschicht speichert ihren eigenen Arbeitsstand im Issue **„Helferlein Wunschliste – Nachtschicht-Arbeitsstand“**. Das frühere allgemeine Status-Issue bleibt historisch bestehen und wird von der neuen Version nicht fortgeschrieben.

Die Nachtschicht führt **keine automatischen Codeänderungen, Datenbankänderungen oder Deployments** durch. Sie darf nur lokale Repository-Dateien lesen und ihren Status in GitHub Issues protokollieren. Das GitHub-Token besitzt hierfür `contents: read` und `issues: write`, aber keine Schreibrechte für Repository-Code.

Die zwei zusätzlich vorhandenen, nur manuell auslösbaren OpenAI-Analyse-/Vorschlagsjobs wurden ebenfalls auf Wunschlisten-Dokumente und -Aufgaben eingeschränkt. Der Draft-PR-Agent erzeugt weiterhin lediglich einen Vorschlag, keinen ausführbaren Code.

## Sicherheitsgrenzen

- Keine Testdaten in der produktiven Supabase-Datenbank.
- Keine Service-Role-Schlüssel in Browsercode oder Berichten.
- Keine automatischen Merges oder produktiven Deployments durch die Nachtschicht.
- Fehlgeschlagene Wunschlisten-Prüfungen markieren den betreffenden Workflow-Lauf als fehlerhaft.
- Die statischen Guardrails verhindern, dass fachfremde Prüfungen versehentlich wieder in die Nachtschicht gelangen.

## Abgrenzung

Andere, allgemeine CI-Workflows des Repositories können unabhängig von der Nachtschicht weiterlaufen. Die Einschränkung betrifft den Nachtschicht-Koordinator und die beiden OpenAI-Agent-Piloten, nicht sämtliche GitHub Actions des Projekts.

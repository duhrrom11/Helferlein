# OpenAI API: Read-only Agent – Einrichtung

**Stand:** Nur als Draft-PR vorgeschlagen. Der Agent ist nicht aktiviert und es wurde kein API-Aufruf ausgeführt.

## Sicherheitsprofil

- Workflow: `.github/workflows/openai-readonly-agent.yml`, **nur manuell** (`workflow_dispatch`), keine nächtliche automatische API-Abrechnung.
- GitHub-Token: nur `contents: read`; keine Issue-, Pull-Request-, Commit- oder Deployment-Schreibrechte.
- OpenAI Responses API mit `store: false`, ohne Tools, ohne Codeausführung.
- Eingaben: maximal drei fest definierte, versionierte Dokumente, auf 12.000 Zeichen je Datei begrenzt.
- Ausgabe: ausschließlich in der GitHub-Actions-Run-Zusammenfassung. Sie kann in einem öffentlichen Repository öffentlich einsehbar sein; keine Geheimnisse in Dokumente oder Ausgabe aufnehmen.
- Fehlender API-Key: überspringt den API-Aufruf; meldet dies im Log.
- Keine automatischen Produktivänderungen oder Datenbankzugriffe.

## Erforderliches Secret

1. Einen separaten API-Key mit eingeschränkten Rechten und einem eigenen Budget im OpenAI API-Dashboard erzeugen: https://platform.openai.com/api-keys
2. GitHub-Repository öffnen: **Settings → Secrets and variables → Actions → New repository secret**.
3. **Name:** `OPENAI_API_KEY`; **Value:** der neue geheime API-Key.
4. Den Key niemals in Commit, Issue, Chat, Logs oder Workflow-Dateien eintragen. API-Nutzung kann Kosten verursachen; ein Budget/Usage-Limit beim API-Anbieter setzen.

**Optional:** Das Modell ist derzeit im Workflow als `gpt-5-mini` festgelegt. Vor produktiver Verwendung die Berechtigung und Verfügbarkeit dieses Modells im API-Projekt prüfen. Die Modellwahl kann später in der Workflow-Datei angepasst werden.

## Freigaben

1. Diesen Draft-PR durchsehen und erst nach ausdrücklicher Zustimmung mergen.
2. Branch Protection / Rulesets für `main` konfigurieren: Pull Requests, erforderliche Statusprüfungen und menschliche Freigabe. Keine automatische Merge-Regel.
3. Nach dem Merge unter **Actions → Helferlein OpenAI Agent (read-only pilot) → Run workflow** einen manuellen Test starten.
4. In der Laufzusammenfassung prüfen, dass nur eine Aufgabenanalyse ausgegeben wurde und kein Code verändert wurde.
5. Für echte Codeänderungen ist später ein **separater** Agent-Workflow mit isoliertem Branch-Schreibzugriff, Draft-PRs, Freigabe und Kostenbegrenzung erforderlich. Dieser Pilot darf dafür nicht stillschweigend erweitert werden.

## Kosten- und Betriebsgrenzen

Ein API-Aufruf pro manuellem Start, maximal 1.000 Ausgabetokens, höchstens 90 Sekunden Netzwerkwartezeit. Das ist keine absolute Kostenobergrenze; Kostenlimits müssen zusätzlich beim Anbieter konfiguriert werden. Der bestehende 5-Minuten-Nachtkoordinator bleibt unverändert und verwendet keinen OpenAI-Key.

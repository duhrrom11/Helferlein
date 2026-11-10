# OpenAI Draft-PR-Agent – Sicherheitsstufe 1

**Status:** Noch nicht aktiviert. Nur als separater Pull Request vorgeschlagen.

Dieser Agent ist **manuell** startbar. Er analysiert ausgewählte versionierte Dokumente mit der OpenAI Responses API und erstellt genau **eine neue Markdown-Datei** unter `docs/agent-proposals/vorschlag-<run-id>.md` auf einem eigenen Branch. Anschließend versucht er, einen **Draft-Pull-Request** gegen `main` zu eröffnen.

Er schreibt **keinen ausführbaren Code**, führt keine Modellantwort als Befehl aus und hat keinen Supabase-Zugriff. Dies ist die erste sichere Stufe der PR-Automatisierung, **noch keine selbstständige Codeimplementierung**.

## Voraussetzungen und Freigaben

1. Das bereits konfigurierte GitHub Actions Secret `OPENAI_API_KEY` wird wiederverwendet.
2. Pull Request dieses Workflows nach menschlicher Prüfung mergen.
3. GitHub → Settings → Actions → General → Workflow permissions: Für diesen Job muss GitHub Actions das **Erstellen von Pull Requests** gestatten. Die Workflow-Datei fordert explizit `contents: write` und `pull-requests: write` an. Falls Organisationsrichtlinien dies verbieten, nicht umgehen; den Administrator um Freigabe bitten.
4. Schutzregeln für `main`: PR-Review und keine automatische Merge-Freigabe konfigurieren. Die GitHub-Repository-Einstellungen können das tatsächliche Sicherheitsniveau beeinflussen.
5. Actions → **Helferlein OpenAI Draft PR Agent** → **Run workflow**. Erst einen manuellen Lauf und dessen neuen Draft-PR prüfen.
6. Vor regelmäßigen Läufen: Kostenbudget, Rate-Limits, Branch-Aufräumregeln und strengere CI-Checks festlegen.

## Sicherheitsgrenzen

- Ein Agent-Lauf erzeugt nur die erlaubte Dokumentationsdatei; der Git-Index wird vor dem Push auf genau diese Datei geprüft.
- Der GitHub-Token darf ausschließlich im PR-Erstellungsschritt schreiben. Anders als der lesende Pilot benötigt dieser Workflow zeitlich begrenzt Repository-Schreibrechte.
- Es gibt keinen Zeitplan, kein Auto-Merge, keine Produktionsfreigabe, keine Migrationen, keine Deployments.
- Der Modelltext ist **nicht vertrauenswürdig** und muss von Menschen geprüft werden. Ein Draft-PR ist kein Nachweis der Codequalität.
- GitHub-PR-Inhalte und GitHub-Actions-Logs können bei einem öffentlichen Repository öffentlich sichtbar sein. Keine Geheimnisse oder echten Nutzerdaten als Eingabe hinzufügen.
- Für eine spätere echte Codeimplementierung muss ein **separater** freigegebener Workflow mit isolierter Umgebung, Datei-Allowlist, Test-Sandbox und zusätzlichen Review-Gates entstehen.

## Fehlerfälle

- `Resource not accessible by integration` oder PR-Erstellung verboten: GitHub Actions Workflow Permissions prüfen.
- `OPENAI_API_KEY is not configured`: Repository-Secret prüfen, niemals in Logs ausgeben.
- Leere OpenAI-Antwort: GitHub-Jobstatus prüfen; keine automatischen kostenpflichtigen Wiederholungen.

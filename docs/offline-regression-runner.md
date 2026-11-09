# Gebündelte Offline-Regressionen

Der Release-Smoke-Workflow führt 16 vorhandene Regressionen über `node scripts/run-regressions.cjs` aus. Der Runner prüft alle Fälle auch dann, wenn ein einzelner Test fehlschlägt.

- Jeder Test läuft in einem eigenen Node-Prozess.
- Pro Test gelten 30 Sekunden Timeout und 2 MiB Ausgabelimit.
- Fehler werden als Exitcode, Timeout, Signalkill, Ausgabelimit oder Startfehler ausgewiesen.
- GitHub Actions erhält eine Tabelle mit Ergebnis, Dauer und Fehlergrund.
- Der gesamte Job scheitert, wenn mindestens ein Test scheitert.
- Vorab prüfen Guardrails die 16 erwarteten Dateien und die Fehlerbehandlung.

Der Runner arbeitet mit den vorhandenen Offline-Regressionen. Er ersetzt keine End-to-End-Prüfung, keine produktiven Supabase-RLS-Prüfungen und keinen Security-Scan.

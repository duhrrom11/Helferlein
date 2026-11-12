# Sicherheitsrichtlinie – Helferlein

## Geltungsbereich und Release-Status

Helferlein wird als Webanwendung über GitHub Pages ausgeliefert. Sicherheitskorrekturen werden auf dem aktiven `main`-Stand gepflegt. Die bisher hier aufgeführten Versionsreihen 4.x/5.x waren Platzhalter und stellen **keine** verifizierte Supportzusage dar.

**Wichtig für den digitalen Nachlass (A10):** Die vorhandene Dokumentation `docs/vault-migration-security.md` beschreibt die sichere Cloud-Tresormigration ausdrücklich als noch nicht freigegeben. Die dort genannte `vault-api` darf nicht als produktiv bereitgestellt oder freigegeben bezeichnet werden, solange Authentifizierung, serverseitige Autorisierung, Wiederherstellung, Monitoring und Rollback nicht nachgewiesen sind. Gesperrte bestehende Firestore-Tresore dürfen nicht durch pauschale Regelöffnungen zugänglich gemacht werden.

## Sicherheitslücken melden

Bitte **keine** Passwörter, Wiederherstellungsschlüssel, Tresorinhalte, Tokens oder personenbezogenen Daten in öffentlichen GitHub-Issues oder Pull Requests veröffentlichen.

Melde mögliche Sicherheitslücken vertraulich über die GitHub-Sicherheitsmeldung des Repositories, **sofern dort Private Vulnerability Reporting aktiviert ist**. Falls dieser Meldeweg nicht verfügbar ist, veröffentliche keine technischen Ausnutzungsdetails oder Geheimnisse; bitte den Repository-Betreiber zunächst über einen bereits bekannten privaten Kommunikationsweg um einen sicheren Kontaktkanal.

Wir veröffentlichen hier bewusst keine unbestätigten Reaktionszeiten, Supportversionen oder Sicherheitsfreigaben.

## Minimale Release-Prüfung

Vor sicherheitsrelevanten Veröffentlichungen müssen mindestens die betroffenen Sicherheits- und Release-Checks erfolgreich sein. Für A10 sind zusätzlich die dokumentierten Freigabebedingungen der Tresor-Cloudmigration erforderlich. Ein grüner allgemeiner Smoke-Test allein bestätigt **keine** produktive Cloud-Tresorfreigabe.

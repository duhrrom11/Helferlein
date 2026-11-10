# Helferlein 10 – Nachlassverwaltung und Erben: Firebase → Supabase

Stand: 2026-11-10. **Umsetzungsplan, kein produktiver Cutover.**

## Verifizierter Ist-Zustand

- `tools/digitaler-nachlass/index.html` bindet Firebase Firestore **und** Supabase ein. Supabase Auth und `public.vault_cloud_snapshots` dienen derzeit der verschlüsselten Sicherung/Wiederherstellung; der aktive Nachlass-Tresor verwendet weiterhin Firestore.
- `tools/digitaler-nachlass/erben.html` liest `vaults/{vaultId}` und aktualisiert `emergencyTriggers.{personKey}` unmittelbar über Firestore, ohne verifizierte serverseitige Erben-Authentisierung.
- Der UI-Code erzeugt derzeit Erben-Links mit `#key=` und einem Masterschlüssel. Nach Aussage des Betreibers sind eventuell vorhandene Daten und Links ausschließlich manuelle Tests; eine Altlink-Migration ist daher nicht vorgesehen. **Die Fähigkeit des Codes, solche Links neu zu erzeugen, bleibt dennoch ein Sicherheitsproblem.**
- In Supabase PROD existiert `public.vault_cloud_snapshots` mit `owner_user_id`, `vault_id`, `encrypted_data`, `updated_at`, `recovery_key` und `encrypted_config`. Dies ist keine Erben-Freigabe-API.
- Die Offline-Module `release-policy-v2.cjs`, `server-auth-v2.cjs`, `server-api-v2.cjs` und `migration-preflight-v2.cjs` sind **nicht** mit dem produktiven Erben-Portal verbunden. `decideMigrationGate()` sperrt die Migration.

## Umsetzung in überprüfbaren Etappen

1. **Bestands- und Berechtigungsprüfung:** Firebase-Regeln und vorhandene Testdatensätze nur über berechtigte Administrationszugänge prüfen. Keine Annahme, dass Supabase-RLS Firestore schützt. Löschungen erst nach eindeutiger Zuordnung zum Nachlass-Testbestand.
2. **Serverseitiges Erben-Modell:** Separate, eindeutig an Supabase Auth gebundene Eigentümer-/Erben-Identitäten und Einladungen; serverseitig geprüfte Zustände `LOCKED`, `ALARM_PENDING`, `RELEASED`, `CANCELLED`, `REVOKED`. Keine Autorisierung aus `person`, `vaultId`, Browserzeit oder Client-`actorId`.
3. **Daten- und Schlüsseltrennung:** Zufällige Tresorschlüssel, nur verschlüsselte Nutzdaten; getrennte Erben-Schlüsselhüllen. Kein Masterschlüssel in URLs, Logs, Datenbank-Klartext oder frei zugänglichen API-Antworten. Keine `service_role`-Schlüssel im Browser.
4. **RLS und Server-API:** Eigentümerzugriffe ausschließlich auf eigene Tresore; Erben nur auf explizit freigegebene Schlüsselhüllen nach serverseitiger Authentisierung. Mutationen atomar und mit vertrauenswürdiger Serverzeit; Rate Limits und Audit. Negative Zugriffsprüfungen für anonym, fremden Eigentümer, fremden Erben, Widerruf und Replay.
5. **UI-Cutover:** Nachlassverwaltung und Erben-Portal schrittweise auf die geprüften Supabase-Endpunkte umstellen. Firebase-Client und `#key=`-Erzeugung erst entfernen, wenn die Ersatzfunktionen nachweislich funktionieren.
6. **Bereinigung:** Ausschließlich identifizierte manuelle Nachlass-Testdaten löschen; Firebase-Konfiguration und Abhängigkeiten erst nach bestandenem Cutover und dokumentiertem Rollback entfernen.

## Freigabe-Gates vor produktiver Aktivierung

- Vollständige unveränderte Node- und Browser-Tests aus `.github/workflows/b3-nachlass.yml` grün, einschließlich isolierter RLS- und API-Negativtests.
- Unabhängig verifizierte Verschlüsselung, Wiederherstellung, Schlüsselrotation und Widerrufsgrenzen.
- Serverautorisierung, Auth-Sitzungen und RLS nachgewiesen; Firestore-Regeln und verbleibende Zugriffe inventarisiert.
- Eindeutige Identifikation des löschbaren Testbestands, Backup-/Rollback-Prozedur und dokumentierte Cutover-Entscheidung.
- Keine produktive Migration allein durch einen Client-Schalter oder `decideMigrationGate()`-Eingaben.

**Dieser Plan ändert weder Datenbanken noch laufende Freigaben und schaltet Firebase nicht ab.**

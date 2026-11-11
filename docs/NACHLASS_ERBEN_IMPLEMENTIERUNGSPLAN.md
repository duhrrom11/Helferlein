# Nachlassverwaltung und Erben-Portal – Implementierungsplan für atomare Freigaben

**Stand:** 2026-11-10 · **Status:** implementierungsreife Schnittstellen- und Transaktionsspezifikation, NICHT deployed · **Scope:** ausschließlich digitaler Nachlass und Erben-Portal.

Verbindliche Sicherheitsgrundlagen: [NACHLASS_ERBEN_SICHERHEITSVERTRAG.md](NACHLASS_ERBEN_SICHERHEITSVERTRAG.md) und [ROADMAP_NACHLASS_ERBEN.md](ROADMAP_NACHLASS_ERBEN.md). Dieser Text ist keine ausführbare Migration; Review-only-SQL darf niemals unverändert auf Produktion angewandt werden.

## 1. Inventar der heute existierenden Datenflüsse

| Pfad | Quelle/Ziel | Daten | Risiko / Maßnahme |
| --- | --- | --- | --- |
| `tools/digitaler-nachlass/index.html` – lokale Erstellung/Speicherung | Browser LocalStorage: `digital_estate_vault` | Lokale Tresorkonfiguration einschließlich `masterKeyHex`; Inhalte unter `encryptedData` | Lokaler Schlüsselzugriff bleibt; Browser/Endgerät schützen und Recovery/Aufbewahrung vor späterer Migration klären |
| Firebase-Synchronisierung `performVaultSync` | Firestore `vaults/{vaultId}` | `encryptedData` (verschlüsselt), **unverschlüsselt**: `ownerName`, `ownerEmail`, `lastCheckIn`, `checkInIntervalDays`, `alarmPersons`, `updatedAt` | Bestehenden Datenbestand nicht löschen; Sicherheitsregeln und Alt-Datenhaltung auditieren; Cloud-Metadaten sind kein verlässlicher serverseitiger Freigabeentscheid |
| Firebase-Alarm `checkIncomingAlarms` / `clearEmergencyAlarm` | Firestore `vaults/{vaultId}` | `emergencyTriggers`, `lastCheckIn` | Keine Erbenfreigabe auf Basis dieser clientseitigen Felder; Alarmlogik später atomar auf Server übertragen |
| Supabase-Besitzerbackup | `public.vault_cloud_snapshots` | `owner_user_id`, `vault_id`, `encrypted_data`, `encrypted_config`, `recovery_key` | RLS-Eigentümerbereich. Verschlüsseltes Backup erhalten. Diese Tabelle ist **keine** Einladungstabelle |
| Historische Erben-Links | `erben.html?vaultId=...&person=...#key=<masterKeyHex>` | Vollständiger 256-Bit-Master-Key im URL-Fragment | Besitzer-UI erzeugt seit Hardening keine neuen Links, QR/PDF oder E-Mails damit; alte Links möglicherweise kompromittiert und nicht rückrufbar |
| Aktueller Erben-Portal-Einstieg | `erben.html` | Keine Cloud- oder Schlüsseldaten | Fail-closed: zeigt nur Sperrhinweis; keine Erbenberechtigung ist produktiv aktiv |

**Produktiver DB-Abgleich (nur gelesen):** `vault_cloud_snapshots` hat als Primärschlüssel **`owner_user_id`**, nicht `vault_id`. Das Datenmodell enthält keine `vault_ownership`-Tabelle, keine `trusted_person_invitations` und keine `vault_trusted_persons`. Aus `vault_id` allein darf deshalb kein Eigentümerrecht abgeleitet werden. Die vorhandenen SQL-Drafts müssen angepasst werden; die alten `SECURITY DEFINER`-Entwürfe dürfen nicht als produktive RPC freigeschaltet werden.

## 2. Verbindlicher API-Vertrag (Version 1)

Alle Endpunkte POST, JSON, Body-Limit, No-Store, gleichförmige Fehler. Benutzeridentität serverseitig aus **Supabase `auth.getUser(accessToken)`**; Body-Felder `userId`/`ownerId` sind für Autorisierung unzulässig. Nur ein enges, nicht browserzugängliches Backend darf privilegierte DB-Transaktionen durchführen. Rate Limits und Audit ohne Tokens/Schlüssel.

| Operation | Request | Ergebnis | Autorisierung |
| --- | --- | --- | --- |
| `heir-invitation.create` | `vaultId`, `intendedUserId`, `expiresAt`, optionaler Public-Key-Fingerprint | generierter einmaliger Token nur in Antwort an authentifizierten Besitzer | JWT-UID = aktuell gesperrter `vault_cloud_snapshots.owner_user_id`; Ziel-UID existiert; kurze TTL und Limit |
| `heir-invitation.redeem` | einmaliger Token, eigene Public-Key-Bindung | `accepted` oder `denied`, keine Schlüsselhülle | JWT-UID = auf Einladung gespeicherte `intended_user_id`; Hashvergleich, Ablauf und Widerruf **in derselben TX** |
| `heir-invitation.revoke` | `invitationId` oder `heirUserId` | bestätigter Revoke-Status | JWT-UID = aktueller Besitzer; sperrt Einladung, Zuordnung und zukünftigen Schlüsselabruf atomar |
| `heir-envelope.put` | `heirUserId`, AEAD-/KEM-Version, Public-Key-Fingerprint, verschlüsselte DEK-Hülle und Integritätsmetadaten | Hüllen-Version; **keine** Klartextschlüssel | JWT-UID = Besitzer; aktiver akzeptierter Erbe; Envelope-Fingerprint an geprüften Erben-Key gebunden |
| `heir-alarm.raise` | `vaultId`, Request-ID | `pending` + minimaler Status | akzeptierte, nicht widerrufene Person; keine unmittelbare Freigabe |
| `heir-alarm.cancel` | `vaultId`, Request-ID | `cancelled` | aktueller Besitzer; sperrt künftige Ausgabe |
| `heir-release.status` | `vaultId` | `locked/eligible/released/denied` ohne Geheimnisse | geprüfter Erbe; keine Existenzlecks für Fremde |
| `heir-release.fetch` | `vaultId`, Request-ID | Hülle + verschlüsselter Snapshot **nur bei aktueller Freigabeberechtigung** | serverseitige Zeit/Grace, aktuelle Zuordnung, Envelope-Version, aktueller Owner unter denselben Locks |

Eine angenommene Einladung ist **keine** Freigabe. Es gibt keinen Endpunkt, der die serverseitige Freigabezeit akzeptiert oder den DEK-/Master-Key als Klartext zurückliefert.

## 3. Datenbankschema – genaue Anforderungen vor Migration

Bestehende `vault_cloud_snapshots`-Spalten und Verschlüsselungsdaten nicht umbenennen, überschreiben oder löschen. Für neue Tabellen eigene private Schema-Namespace, begrenzte Rollen, `ENABLE ROW LEVEL SECURITY` und ggf. `FORCE ROW LEVEL SECURITY`, keine direkten Browser-GRANTs. Sämtliche Constraints im **isolierten PG17** ausprobieren und `pg_proc.proacl`, Besitzerrollen, Membership und `search_path` gegen reale Rollen auditieren.

1. **`heir_invitations`**: `id uuid PK`, `owner_user_id uuid NOT NULL` FK zur vorhandenen Snapshot-Owner-PK (bewusste Löschsemantik, kein stilles CASCADE), `vault_id text` geprüft auf gleichzeitigen Eigentümersnapshot, `intended_user_id uuid`, `token_sha256 bytea UNIQUE` (32 Byte), `created_at`, `expires_at`, `accepted_at/by`, `revoked_at/by`, `version bigint`. Checks: gültige Reihenfolge, Akzeptanz nur für Ziel-ID, angenommen und widerrufen nicht gleichzeitig. Token selbst **niemals speichern**.
2. **`heir_assignments`**: `owner_user_id`, `heir_user_id`, `invitation_id`, `accepted_at`, `revoked_at`, `version`. Eindeutigkeit je Eigentümer/Erbe; zusammengesetzter FK stellt Besitzer und vorgesehenen Erben derselben Einladung sicher. Erbenrolle entsteht nur nach atomarer Einlösung.
3. **`heir_public_keys`**: `heir_user_id`, `key_id`, `algorithm`, `public_key`, `fingerprint`, `created_at`, `revoked_at`; Registrierung an verifizierten JWT gebunden. Schlüsseltausch/Austausch erzwingt neue Hülle. Keine privaten Schlüssel speichern.
4. **`heir_envelopes`**: `owner_user_id`, `heir_user_id`, `assignment_version`, `key_id`, `envelope_version`, `algorithm`, `ciphertext`, `nonce` und zugeordnetes AAD-Schema. Nur vom Eigentümer erzeugte, zu dieser Identität passende Hüllen; kein Klartextschlüssel.
5. **`heir_release_cases`**: `owner_user_id`, `state`, `triggered_at`, `grace_until`, `cancelled_at`, `released_at`, `version`; systemseitige DB-Zeit; Freigabe nur nach dokumentiertem Zustand und Karenzzeit. Keine vom Browser gesetzte Uhr.
6. **`heir_security_events`**: unveränderbare, datensparsame Ereignisse mit `actor_user_id`, `owner_user_id`, `action`, `occurred_at`, `request_id`, `outcome`. Keine Schlüssel, Tokens, Namen oder unverschlüsselte Tresorinhalte.

**Wichtige FK-Besonderheit:** Bei `vault_cloud_snapshots` ist bisher `owner_user_id` der Primärschlüssel und `vault_id` nur formatgeprüft. Für Fremdschlüssel niemals ungeprüft `REFERENCES vault_cloud_snapshots(vault_id)` verwenden. Für alle neuen Mutationen erst `owner_user_id` als Lock-Anker nehmen, dann `vault_id` mit aktuellem Snapshot vergleichen. Eine mögliche spätere UNIQUE-Constraint auf `vault_id` muss auf Altbestand geprüft werden.

## 4. Einzige atomare Sperrreihenfolge und Transaktionsgrenzen

Bei jeder konkurrierenden Aktion gilt **identische Reihenfolge**:
`vault_cloud_snapshots(owner_user_id) FOR UPDATE` → `heir_invitations(id) FOR UPDATE` (falls betroffen) → `heir_assignments(owner_user_id,heir_user_id) FOR UPDATE` → `heir_release_cases(owner_user_id) FOR UPDATE` → `heir_envelopes(...) FOR UPDATE`.

- **Einladung:** Besitzer und aktueller `vault_id` gesperrt prüfen; keine Einladung mit fremder/falscher UID; Token einmalig zufällig erzeugen, SHA-256 nur serverseitig speichern, kurze Ablaufzeit nach DB-Uhr.
- **Annahme:** Token-Hash erst unverbindlich zum Besitzer-/Einladungs-Schlüssel auflösen (kein Trust), anschließend in obiger Reihenfolge sperren und alle Token-/UID-/Ablauf-/Eigentümerbedingungen **neu** prüfen. Bei Konflikt generische Ablehnung. Keine clientseitig behauptete `verified_user_id` an privilegierte RPC.
- **Widerruf:** Unter denselben Locks Einladung/Zuordnung widerrufen, Version erhöhen und aktuelle Hüllen für künftige Abrufe deaktivieren; keine stille Reaktivierung eines widerrufenen Eintrags.
- **Freigabe:** Verifizierter Erbe; gesperrte aktive Zuordnung und aktuelle Eigentümerbindung; tatsächlich berechtigter Serverzustand nach Datenbankuhr; passende Public-Key-/Envelope-Version; Entscheidung, Audit und selektiver Abruf als konsistenter Vorgang. Kein SELECT der Hülle vor allen Gates.
- **Eigentümerwechsel:** Bevor später eingeführt, muss er denselben Snapshot-Lock und Transaktionsvertrag befolgen und Erbenberechtigungen/Hüllen invalidieren oder sicher migrieren.
- Abgebrochene Transaktionen geben keine Schlüsselhülle heraus. Bereits heruntergeladene Hüllen bzw. entschlüsselte Daten sind durch späteren Widerruf **nicht rückholbar**; zur Sperre zukünftiger Daten ist DEK-Rotation/Reverschlüsselung erforderlich.

## 5. Endgeräte-Kryptografie und Migrationsgrenzen

- Lokaler DEK per CSPRNG, AEAD mit authentifizierter Identität/AAD und nonce-sicherer Versionierung; Hülle je Erben-Public-Key mit festgelegter, geprüfter KEM/Hybrid-Encrypt-Bibliothek statt selbst erfundener Kryptografie.
- Server und DB dürfen DEK, Legacy-Master-Key oder private Schlüssel niemals als Klartext sehen. `vault_cloud_snapshots.encrypted_data`, `encrypted_config`, `recovery_key` unverändert erhalten. `recovery_key` ist als verschlüsselte Recovery-Hülle zu behandeln, nicht als unbeschränkter Erben-Key.
- Bestehende `?key=` / `#key=`-Notfallunterlagen sind nicht widerrufbar. Kein automatisches Rewrapping mit ungeprüfter Browseridentität. Besitzer muss alte Unterlagen lokal widerrufen/ersetzen und den Tresor kontrolliert mit frischen Schlüsselmaterialien neu verschlüsseln, sobald die neue Pipeline verfügbar ist.

## 6. Auslieferungspakete und Gates

**Paket 1 – ohne produktiven Zugriff:** Bestehende ungesicherte Link-Ausgabe entfernen; Firebase-/Supabase-Datenflüsse erfassen; Freigabevertrag festlegen und im Repo prüfen. Die lokal gespeicherten Tresordaten und bestehenden Cloud-Backups bleiben unverändert.

**Paket 2 – isolierte PostgreSQL-17-Integration:** Implementiere Tabellen, minimale Rollen, Funktionen und JWT-verifizierende Edge APIs gebündelt. Prüfe zwei echte Sessions (Einlösung vs Widerruf, Freigabe vs Widerruf, Eigentümerwechsel), RLS, EXECUTE, `SECURITY DEFINER`, falsche Erben-UID und Timeout. Dazu ein echter Browser-End-to-End-Ablauf inkl. Schlüsselhülle.

**Paket 3 – kontrolliertes Deployment:** Backup, Rollback und Produktionsmigration, anschließend Edge Functions und UI; Produktivfreigabe und tatsächlicher Datenzugriff **erst nach bestandenem Gate**. Bei fehlendem Gate bleibt das Erben-Portal gesperrt.

### Offene Fragen, die vor Implementierung nicht stillschweigend entschieden werden dürfen

- Rechts-/Produktdefinition „Erbe“ versus „Vertrauensperson“ und wer einen Notfall legitim auslösen darf.
- Nachweissystem für Tod bzw. Freigabe: Browser-Check-in allein ist **kein** rechtswirksamer Nachweis.
- Schlüssel-KEM und Enrollment-Protokoll bei mehreren Endgeräten; Wiederherstellung ohne dauerhafte Hintertür.
- Rechtssichere Datenhaltung und Lösch-/Aufbewahrungsregeln alter Firebase-Metadaten; Bestandsaufnahme statt vorschneller Löschung.
- Umgang mit schon weitergegebenen Legacy-Master-Key-Links und Vertrauen in bisherige Firestore-Regeln.

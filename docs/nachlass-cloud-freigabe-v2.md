# Nachlass: Cloud-Berechtigungen und serverseitige Erben-Freigabe
Stand: 2026-11-10 · Sicherheitsentwurf, **nicht produktiv implementiert**

## Verifizierter Ist-Zustand (read-only)

Produktive Supabase-Instanz `avapuibsidubuzxjtyld`: `public.vault_cloud_snapshots` hat RLS aktiviert. Richtlinien `owner_select`, `owner_insert`, `owner_update`, `owner_delete` beschränken alle vier Operationen auf `auth.uid() = owner_user_id`. UPDATE prüft sowohl `USING` als auch `WITH CHECK`. Die Tabelle besitzt `owner_user_id`, `vault_id`, `encrypted_data`, `updated_at`, `recovery_key`, `encrypted_config`. Keine Datensätze wurden gelesen oder geändert; nur Katalog und Richtlinien.

**Geltungsgrenze:** Die RLS-Richtlinien gelten für Supabase-Tabellenzugriffe. Das vorhandene Erben-Portal verwendet hingegen Firestore-Projekt `nachlass-app-99df8` und führt `vaults/{vaultId}`-Lesezugriffe sowie direkte Updates an `emergencyTriggers.{personKey}` aus. Firestore Security Rules und Identitätsprovider sind hier **nicht verifiziert**. Aus Supabase-RLS lässt sich keine Firebase-Sicherheit ableiten.

## Kritische Vorbedingungen

1. Firestore Security Rules aus der produktiven Firebase-Konsole exportieren und **offline** auditieren; keine echten Tresordaten oder Schlüssel kopieren.
2. Bestehende Erben-Links enthalten `#key=` und sind unabhängig von der Anzeige der Frist entschlüsselbar. **Kein** serverseitiges Gate kann bereits verteilte Schlüssel rückwirkend geheim machen.
3. Keine Änderungen an bestehenden Firebase- oder Supabase-Regeln ohne Negativtests und Rollback.
4. Keine produktiven Testdatensätze. Isolierte Emulator-/Testumgebung für Zugriffstests verwenden.

## Geplantes Freigabeprotokoll v2 (Design)

- **Inhaber:** Nachlassinhalt mit zufälligem 256-Bit-DEK per AES-GCM verschlüsseln. Ein unabhängiger Recovery-Weg verbleibt beim Inhaber. Das alte `masterKeyHex` darf nicht im Erben-Link stehen.
- **Erbenberechtigung:** Authentisierte, explizit eingeladene Person mit verifizierter Identität. Ein Kontaktname oder URL-Parameter `person` genügt nicht. Die Freigabezuordnung ist serverseitig gespeichert und widerrufbar.
- **Schlüsselhülle:** Für jede berechtigte Person eine gesonderte verschlüsselte DEK-Hülle; das zur Entschlüsselung erforderliche Material wird vor Freigabe nicht vollständig ausgeliefert. Schlüsselhülle, Freigabe-Token und Ciphertext dürfen vor Freigabe nicht gemeinsam den DEK rekonstruieren lassen. Die konkrete Kryptokonstruktion erfordert ein separates Security Review.
- **Freigabezustand:** `LOCKED -> ALARM_PENDING -> RELEASED`, mit `CANCELLED` und `REVOKED`. Zustandsübergänge sind serverseitig autorisiert, transaktional und auf vertrauenswürdige Serverzeit gestützt. Keine lokale `Date.now()` als Berechtigungsgrundlage.
- **Check-in:** Eigentümerauthentisierung, atomarer Check-in und Auditprotokoll; ein gültiger Check-in kann einen noch nicht freigegebenen Alarm abbrechen.
- **Notfall:** Nur eingeladene, aktive Person darf auslösen; Rate Limits, Cooldown, Zustellversuche und unabhängige Benachrichtigung. Ein 24-Stunden-Timer alleine ist kein Erbnachweis.
- **Freigabe:** Server prüft den Zustand bei jedem Abruf, liefert nur freigegebenes, verschlüsseltes Erbenmaterial an die berechtigte Person. Keine Klartext-Geheimnisse auf dem Server.
- **Widerruf:** Vor Freigabe Berechtigung entziehen; nach Offenlegung eines DEK ist kryptografischer Widerruf ohne Rotation unmöglich.
- **Migration:** Versionierte Datenformate und opt-in; alte Tresore und Links unverändert erhalten, bis unabhängige Sicherung, Wiederherstellung, Rollback und explizite Bestätigung vorliegen.

## Negativtests vor Produktivsetzung

- Unangemeldete Person kann keine Schlüsselhülle oder Alarmentscheidung lesen/ändern.
- Person A kann niemals Tresor oder Schlüsselhülle von Person B lesen.
- Manipulierter `person`-/`vaultId`-Parameter führt zu keiner Berechtigung.
- Client-Uhr vor-/zurückstellen ändert keine Freigabe.
- Alarm-Spam, Replay, parallele Requests, abgelaufene Tokens und widerrufene Einladungen werden abgewiesen.
- Check-in unmittelbar vor Ablauf und gleichzeitige Alarm-Aktionen sind atomar und deterministisch.
- Alte Links werden korrekt als unsicheres Legacy-Format markiert; keine stillschweigende Kompatibilitätsbehauptung.
- Backups und Schlüsselhüllen bleiben bei Fehlern und Rollback entschlüsselbar.

## Freigabe-Gate

Ohne produktive Firebase-Regeln, geklärte Authentisierung, überprüfte Kryptokonstruktion und bestandene isolierte Negativtests **keine** produktive serverseitige Erben-Freigabe einschalten. Diese Datei ist ein Plan, kein Sicherheitsnachweis.

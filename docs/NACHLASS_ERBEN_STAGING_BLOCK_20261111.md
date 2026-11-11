# Helferlein 10 – Staging-Schlüsselnachweis, HPKE und Alarmzustände

**11. November 2026 – NICHT DEPLOYT / keine produktive Erbenfreigabe**

## Umgesetzter Paketumfang

- `supabase/functions/_shared/heir-key-proof-staging.ts`: authentifizierter Benutzer (externes `VerifyUser` muss `Supabase auth.getUser` prüfen) beginnt eine X25519-Schlüsselregistrierung. Der Server erzeugt einen einmaligen Ephemeral-Key, ECDH-Shared-Secret und einen HKDF-SHA256-Besitznachweis, speichert nur SHA-256 des erwarteten Nachweises und eine fünfminütige Ablaufzeit. Die Antwort enthält nur Challenge-ID, Key-ID, Ephemeral-Public-Key und zufälliges Salt. Beim Abschluss werden unter SQL-Locks die verifizierte Identität, die unbenutzte gültige Challenge und der Besitznachweis geprüft. Falsche Nachweise verbrauchen die Challenge. Private Schlüssel oder Server-Ephemeral-Private-Key werden nicht persistiert.
- `supabase/functions/_shared/heir-hpke-envelope.ts`: clientseitiger RFC-9180-HPKE-Basismodus für DHKEM(X25519,HKDF-SHA256), HKDF-SHA256 und AES-256-GCM. Ein 32-Byte-Tresorschlüssel wird per frischem Ephemeral-Key ausschließlich für den verifizierten Erben-Public-Key verschlüsselt. Als authentifizierte Zusatzdaten (AAD) gehen Owner-ID, Erben-ID, Tresor-ID, Schlüssel-ID und Zuordnungsversion ein. `openHeirDek` ist ausschließlich auf dem Erbenendgerät vorgesehen. Keiner dieser Methoden sendet Klartextschlüssel an eine API.
- `supabase/functions/_shared/heir-release-staging.ts`: `raiseAlarm`, `cancelAlarm`, `reviewStatus` in atomaren SQL-Transaktionen. Der Eigentümerdatensatz wird vor der Erbenzuordnung gesperrt; die Karenzzeit wird mit `clock_timestamp()` in PostgreSQL bestimmt. Nach 24 Stunden lautet der Zustand **nur** `pending_independent_review`. Es gibt ausdrücklich keine Freigabefunktion und keinen Envelope-Fetch. Nur der verifizierte Eigentümer kann den Alarm abbrechen. Abgebrochene Fälle dürfen nicht ohne neuen, gesondert geprüften Prozess wieder aktiviert werden.
- `docs/sql-drafts/heir_key_release_REVIEW_ONLY.sql`: isolierter PostgreSQL-17-Entwurf für Proof-Challenges und Alarmfälle. Er erweitert `heir_private_backend_REVIEW_ONLY.sql` und liegt ausdrücklich **außerhalb** `supabase/migrations`.

## Integration in bestehende Module – noch ausstehend

Der bereits vorhandene `heir-staging-backend.ts` erwartet eine verifizierte `heir_public_keys.verified_at`-Zeile für `putEnvelope`; die neue Challenge-Verifizierung liefert dieses Gate. Seine aktuelle Suite `HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM` stimmt mit dem clientseitigen Envelope-Modul überein. Dennoch fehlt eine tatsächlich geprüfte Vertrauenskette für Public-Key-Enrollment, berechtigte Eigentümeransicht, Envelope-Transport und spätere Freigabe.

Die Bestandsdatenbank `public.vault_cloud_snapshots(owner_user_id PRIMARY KEY, vault_id, encrypted_data, encrypted_config, recovery_key)` wird weder geändert noch mit Testdaten beschrieben. Einladungs-, Proof- und Alarmtabellen existieren dort nicht.

## Mindestprüfungen vor Aktivierung

1. Unabhängige RFC-9180-HPKE-Testvektoren und kryptografische Review des Schlüsselformats, Nonce-/AAD-Vertrags und des Multi-Geräte-Key-Lebenszyklus.
2. Isolierte PostgreSQL 17-Instanz mit zwei Sessions: Einmal-Challenge, abgelaufene Challenge, Annahme gegen Widerruf, Schlüsselhülle gegen Widerruf, Alarm gegen Abbruch und Eigentümerwechsel; Privilegien, RLS/FORCE RLS, Schema-CREATE-Rechte und Funktionsinhaber mit echten Rollen.
3. Verifizierte Supabase-Auth-Integration und eng beschränktes Transaktionskonto ohne browserseitigen Zugriff. Separate Missbrauchsbegrenzung für Challenges und Alarme.
4. Produktentscheidung und unabhängiger, rechtskonformer Freigabenachweis. Die Karenzzeit allein ist **keine** Erbenberechtigung. Erst nach Entscheidung können ein gesonderter Release-Endpunkt und die Auslieferung von verschlüsselten Snapshots und Schlüsselhüllen gebaut werden.
5. E2E-Prüfung mit echter Owner-/Erben-UI, Client-Key-Storage, Restore-/Rotation-/Widerrufsablauf, Backups und Rollback.

**Keine Migration, kein Edge-Function-Deployment, keine produktive Aktivierung.**

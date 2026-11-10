# Offline HPKE RFC 9180 conformance audit (2026-11-10)

Scope: draft PR #249, branch `audit/hpke-negative-tests-clean-20261110`; no production deployment or data changes.

## Suite and evidence

- Base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-256-GCM (KEM 0x0020, KDF 0x0001, AEAD 0x0002).
- CFRG published JSON vector pinned at `cfrg/draft-irtf-cfrg-hpke@5f503c564da00b0687b3de75f1dfbdfc4079ad31`, `test-vectors.json`.
- The same vector covers recipient key derivation, encapsulated key, decryption, and now intermediate DH, eae_prk, shared_secret, secret, key and base_nonce. These checkpoints were independently recomputed using Python cryptography X25519 and HMAC-SHA256.
- Additional negative cases: modified AAD on the published vector; malformed ciphertext sizes; oversized info/AAD; roundtrip and wrong-recipient checks.
- CI for commit `260ce24d7172ea66606f072284d48ce6514c1bb2`: B3 Nachlass pilot run 42782126785 SUCCESS; release smoke run 42782127083 SUCCESS. B3 workflow executes `node --test tests/nachlass-hpke-offline-v2.test.cjs` as part of its Node test step.

## Limits / follow-up

- The intermediate checkpoints are **not a second independent published vector**; all derive from the same pinned CFRG case.
- RFC 9180 Appendix A includes X25519/AES-128-GCM and X25519/ChaCha20-Poly1305 examples, but not the precise X25519/AES-256-GCM suite; do not substitute a different suite as a purported direct match.
- Additional independently sourced X25519/AES-256-GCM test cases, preferably from a second implementation or independently selected CFRG JSON entry, remain pending.
- The prototype is offline-only, single-message and intentionally constrains seal to a 32-byte DEK; these application limits are not general HPKE guarantees.
- Draft PR #249 must not be merged solely on this audit; production rollout and Vercel are out of scope.

References:
- https://www.rfc-editor.org/rfc/rfc9180.html
- https://github.com/cfrg/draft-irtf-cfrg-hpke/blob/5f503c564da00b0687b3de75f1dfbdfc4079ad31/test-vectors.json
- https://github.com/duhrrom11/Helferlein/actions/runs/42782126785
- https://github.com/duhrrom11/Helferlein/actions/runs/42782127083

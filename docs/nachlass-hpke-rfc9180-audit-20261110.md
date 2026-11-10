# Offline HPKE RFC 9180 conformance audit (2026-11-10)

Scope: draft PR #249, branch `audit/hpke-negative-tests-clean-20261110`; no production deployment or data changes.

## Suite and evidence

- Base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-256-GCM (KEM 0x0020, KDF 0x0001, AEAD 0x0002).
- CFRG published JSON vector pinned at `cfrg/draft-irtf-cfrg-hpke@5f503c564da00b0687b3de75f1dfbdfc4079ad31`, `test-vectors.json`.
- The same vector covers recipient key derivation, encapsulated key, decryption, and now intermediate DH, eae_prk, shared_secret, secret, key and base_nonce. These checkpoints were independently recomputed using Python cryptography X25519 and HMAC-SHA256.
- Additional negative cases: modified AAD on the published vector; malformed ciphertext sizes; oversized info/AAD; roundtrip and wrong-recipient checks.
- CI for commit `260ce24d7172ea66606f072284d48ce6514c1bb2`: B3 Nachlass pilot run 42782126785 SUCCESS; release smoke run 42782127083 SUCCESS. B3 workflow executes `node --test tests/nachlass-hpke-offline-v2.test.cjs` as part of its Node test step.

## Follow-up official encryption case\n\nPinned CFRG JSON `mode=0, kem_id=32, kdf_id=1, aead_id=2`, `encryptions[1]`: AAD `436f756e742d31`, nonce `151d9929e2449747889bc922`, ciphertext `2c43aff25343fdbff864506f0818b9d87df84ea01b1a2144d23b4d40c26bf655fdf197fe40297a8aebeed5cc2d`. Its AES-GCM plaintext matches the first encryption. The nonce is `base_nonce XOR 1` per RFC 9180. Independently executed with local Node crypto and obtained `Beauty is truth, truth beauty`. Commit `1e5af0cd` adds regression coverage; CI for that commit is pending.\n\n## Limits / follow-up

- The intermediate checkpoints are **not a second independent published vector**; all derive from the same pinned CFRG case.
- RFC 9180 Appendix A includes X25519/AES-128-GCM and X25519/ChaCha20-Poly1305 examples, but not the precise X25519/AES-256-GCM suite; do not substitute a different suite as a purported direct match.
- The official CFRG JSON suite entry contains 257 encryption cases. We verified `encryptions[1]` (second ciphertext/AAD, sequence-one nonce) independently with Node AES-256-GCM; this is a **second published encryption case**, not a second independent KEM setup. The offline prototype only exposes single-message `open()` at sequence zero, so sequence one is tested directly with Node crypto, not via `open()`. A second independent KEM setup remains pending.
- The prototype is offline-only, single-message and intentionally constrains seal to a 32-byte DEK; these application limits are not general HPKE guarantees.
- Draft PR #249 must not be merged solely on this audit; production rollout and Vercel are out of scope.

References:
- https://www.rfc-editor.org/rfc/rfc9180.html
- https://github.com/cfrg/draft-irtf-cfrg-hpke/blob/5f503c564da00b0687b3de75f1dfbdfc4079ad31/test-vectors.json
- https://github.com/duhrrom11/Helferlein/actions/runs/42782126785
- https://github.com/duhrrom11/Helferlein/actions/runs/42782127083

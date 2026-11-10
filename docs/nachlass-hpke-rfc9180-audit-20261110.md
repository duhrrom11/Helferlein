# Offline HPKE RFC 9180 conformance audit (2026-11-10)

Scope: draft PR #249, branch `audit/hpke-negative-tests-clean-20261110`; no production deployment or data changes.

## Suite and evidence

- Base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256, AES-256-GCM (KEM 0x0020, KDF 0x0001, AEAD 0x0002).
- CFRG published JSON vector pinned at `cfrg/draft-irtf-cfrg-hpke@5f503c564da00b0687b3de75f1dfbdfc4079ad31`, `test-vectors.json`.
- The same vector covers recipient key derivation, encapsulated key, decryption, and now intermediate DH, eae_prk, shared_secret, secret, key and base_nonce. These checkpoints were independently recomputed using Python cryptography X25519 and HMAC-SHA256.
- Additional negative cases: modified AAD on the published vector; malformed ciphertext sizes; oversized info/AAD; roundtrip and wrong-recipient checks.
- CI for commit `260ce24d7172ea66606f072284d48ce6514c1bb2`: B3 Nachlass pilot run 42782126785 SUCCESS; release smoke run 42782127083 SUCCESS. B3 workflow executes `node --test tests/nachlass-hpke-offline-v2.test.cjs` as part of its Node test step.

## Follow-up official encryption case

Pinned CFRG JSON `mode=0, kem_id=32, kdf_id=1, aead_id=2`, `encryptions[1]`: AAD `436f756e742d31`, nonce `151d9929e2449747889bc922`, ciphertext `2c43aff25343fdbff864506f0818b9d87df84ea01b1a2144d23b4d40c26bf655fdf197fe40297a8aebeed5cc2d`. Its AES-GCM plaintext matches the first encryption. The nonce is `base_nonce XOR 1` per RFC 9180. Independently executed with local Node crypto and obtained `Beauty is truth, truth beauty`. Commit `1e5af0cd` adds regression coverage. GitHub CI for this commit has not been independently confirmed.

## CI evidence (scope-limited)

- GitHub Actions run [42782314241](https://github.com/duhrrom11/Helferlein/actions/runs/42782314241): `nachlass-ui` job completed successfully, including Chromium browser verification and evidence preservation. This does **not** establish that the later HPKE test commit `1e5af0cd` passed CI.
- GitHub commit `2f8d9f9d` records this second case; its CI is not independently confirmed.

## Verified CI follow-up (2026-11-10)

- Commit `2f8d9f9dcb2905bc638b44ee33651ce0925f768e`: [B3 Nachlass 42782729693](https://github.com/duhrrom11/Helferlein/actions/runs/42782729693) and [release smoke 42782729760](https://github.com/duhrrom11/Helferlein/actions/runs/42782729760) both completed successfully.
- Audit correction commit `10fd5b52261a24b52af1084d5aa785323d6aef2e`: [B3 Nachlass 42783367200](https://github.com/duhrrom11/Helferlein/actions/runs/42783367200) and [release smoke 42783367165](https://github.com/duhrrom11/Helferlein/actions/runs/42783367165) both completed successfully. B3 `nachlass-ui` and release `smoke` jobs have successful step summaries.
- No direct workflow run was returned for abbreviated test commit `1e5af0cd`. Its test is present in the branch's `tests/nachlass-hpke-offline-v2.test.cjs`, but do not claim a commit-specific CI run.
- A fresh local execution of `node --test tests/nachlass-hpke-offline-v2.test.cjs` against the current feature branch is **not verified** in this follow-up: the available local ZIP is not a checkout of this branch and the environment cannot clone GitHub. Green workflow status must not be misreported as a local execution.

## Limits / follow-up

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

## Follow-up verification after `a0d9515c` (2026-11-10)

- GitHub run [42783604085](https://github.com/duhrrom11/Helferlein/actions/runs/42783604085), Release smoke checks: completed, success.
- GitHub run [42783604208](https://github.com/duhrrom11/Helferlein/actions/runs/42783604208), B3 Nachlass pilot: `nachlass-ui` job completed, success; all returned step summaries successful.
- Both current branch files `tests/nachlass-hpke-offline-v2.test.cjs` (blob `44d2598d`) and `tools/digitaler-nachlass/hpke-offline-v2.cjs` (blob `5910923c`) were fetched via GitHub connector. Local network access to raw GitHub was unavailable, so the exact branch files could not be mounted and the full ten-test suite was **not** executed locally.
- Independent local Node.js v22.16.0 crypto verification using the two published AES-256-GCM ciphertexts, AAD values, published derived key and sequence-derived nonces: `encryptions[0]` PASS, `encryptions[1]` PASS. This is a focused reproduced crypto check, **not** execution of the repository's `node --test tests/nachlass-hpke-offline-v2.test.cjs` and **not** a second independent KEM vector.
- No deployment, Vercel operation, merge, or production data mutation.

## Verified original local Node test suite (2026-11-10)

- Both original source files were retrieved from GitHub branch `audit/hpke-negative-tests-clean-20261110` and reconstructed byte-for-byte locally. `git hash-object` matched GitHub blob SHA for `tests/nachlass-hpke-offline-v2.test.cjs`: `44d2598d68f2b88bca6f5bff7dabaf29f62fa4c0`; for `tools/digitaler-nachlass/hpke-offline-v2.cjs`: `5910923c26b06c41d6931a4dbe66a8947c3ad571`.
- Executed locally using Node.js `v22.16.0`: `node --test tests/nachlass-hpke-offline-v2.test.cjs`. Actual TAP output: `tests 10`, `pass 10`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; duration `1382.975665 ms`. This supersedes the earlier statement that the original branch test suite could not be run locally.
- For preceding audit commit `cc11fb2033fad8fefd3ead49d6779bf740342a23`, GitHub [B3 Nachlass run 42783796286](https://github.com/duhrrom11/Helferlein/actions/runs/42783796286) and [release smoke run 42783796243](https://github.com/duhrrom11/Helferlein/actions/runs/42783796243) both completed successfully.
- These are offline tests of the original two HPKE files, not production integration tests, a second independent KEM setup, a deployment, or a merge authorization.

## Follow-up CI and security coverage review (2026-11-10)

- Audit commit `1d059b355cb6f9992b3809399c6d5fcb2ac66c4f`: [B3 Nachlass pilot 42784120055](https://github.com/duhrrom11/Helferlein/actions/runs/42784120055) and [Release smoke checks 42784120078](https://github.com/duhrrom11/Helferlein/actions/runs/42784120078) both completed with `success` per GitHub workflow-run records.
- Reviewed current branch implementation blob `5910923c26b06c41d6931a4dbe66a8947c3ad571` and test blob `44d2598d68f2b88bca6f5bff7dabaf29f62fa4c0` through GitHub file access.
- Remaining proposed **offline** negative-test coverage: X25519 low-order/invalid public-key behavior (including Node crypto exceptions); explicit AES-GCM authentication-tag corruption; exact 1024/1025-byte `info` and `aad` boundaries; 17/4112/4113-byte ciphertext boundaries; and consistency of application-level error categories. These are test-coverage gaps, not confirmed vulnerabilities.
- This follow-up did **not** add or execute new tests. Direct download of branch source into the local runtime failed due DNS resolution (`Could not resolve host: raw.githubusercontent.com`), and the available local ZIP does not contain these HPKE files. Prior 10/10 execution evidence remains documented above, but is not a fresh run of any newly proposed tests. No new test results are claimed.
- No production data writes, Vercel, deployment, or merge.

## Additional offline HPKE negative tests (2026-11-10)

- Added four regression tests in `tests/nachlass-hpke-offline-v2.test.cjs` at commit [`197522f8`](https://github.com/duhrrom11/Helferlein/commit/197522f870671a0b16f0d20940b0b619152fb504): GCM tag corruption; X25519 all-zero low-order key and malformed 31-byte public key; 1024/1025-byte `info` and `aad` limits; and 16/17/4112/4113-byte ciphertext limits.
- Independently executed a local Node.js v22.16.0 test file containing these four cases against a manually reconstructed offline HPKE implementation: TAP `tests 4`, `pass 4`, `fail 0`, `skipped 0`. This local reconstruction is not byte-identical evidence for the entire GitHub test suite.
- GitHub [release smoke 42784627358](https://github.com/duhrrom11/Helferlein/actions/runs/42784627358) completed successfully for commit `197522f8`.
- GitHub [B3 Nachlass pilot 42784627431](https://github.com/duhrrom11/Helferlein/actions/runs/42784627431) was still in progress at the latest check, but the `Verify preserved security notice and vault contract` step (which runs `node --test` including `tests/nachlass-hpke-offline-v2.test.cjs`) completed successfully. Full workflow success remains pending.
- These tests assert rejection rather than a uniform application-level error category for low-order keys; exception normalization remains a separate possible hardening task. No production integration or deployment.

## CI verification of four new negative tests (2026-11-10)

- For test commit `197522f870671a0b16f0d20940b0b619152fb504`, [B3 run 42784627431](https://github.com/duhrrom11/Helferlein/actions/runs/42784627431) reports the `Verify preserved security notice and vault contract` step as `completed/success`. The checked-in workflow executes `node --test` including `tests/nachlass-hpke-offline-v2.test.cjs` in that step. Its overall `nachlass-ui` job was still `in_progress` during verification (Chromium installation); **do not claim full B3 success**.
- For audit commit `9510f2387c61d076d8ca7a67edbe1de390bcd7e2`, [B3 run 42784691674](https://github.com/duhrrom11/Helferlein/actions/runs/42784691674) likewise reports the Node test step as `completed/success`, with full job still `in_progress` at the last check.
- For audit commit `9510f238`, [release smoke run 42784691490](https://github.com/duhrrom11/Helferlein/actions/runs/42784691490) is `completed/success`.
- These successful GitHub Node steps provide execution evidence for the checked-in suite including the four newly added tests, but step summaries alone do not report individual test counts. The separate reconstructed local run had 4/4 passing, not a byte-identical full 14-test run.
- No production data changes, Vercel, deployment, or merge.

## Final B3 CI and exact HPKE TAP proof (2026-11-10)

- [B3 run 42784627431](https://github.com/duhrrom11/Helferlein/actions/runs/42784627431) for `197522f8` and [B3 run 42784691674](https://github.com/duhrrom11/Helferlein/actions/runs/42784691674) for `9510f238` are both `completed/success`, including Chromium browser verification and evidence upload.
- The actual GitHub Actions job logs were retrieved for jobs `129722662677` and `129722883320`. In both logs, HPKE test cases appear individually as `ok 11` through `ok 24` (14 successful cases), including `ok 21` GCM tag corruption, `ok 22` low-order X25519, `ok 23` 1024/1025-byte context limits and `ok 24` ciphertext boundary checks. The combined Node TAP summary in each run is `# tests 52`, `# pass 52`, `# fail 0`. This is a **direct GitHub CI log proof** of 14/14 HPKE tests, not an inference from a green status alone.
- GitHub confirms preserved `nachlass-test-evidence` artifacts for both B3 runs: artifact IDs `13747881924` and `13749245314` (not expired at verification). The job logs themselves provided sufficient TAP evidence; ZIP contents were not separately inspected.
- For prior audit commit `d82bff7af1b7220f63a7b91e00e9433594f7230b`, [B3 run 42784782054](https://github.com/duhrrom11/Helferlein/actions/runs/42784782054) and [release smoke run 42784782040](https://github.com/duhrrom11/Helferlein/actions/runs/42784782040) both completed with `success`.
- Scope: offline HPKE implementation and tests only. No deployment, production mutation, Vercel, or merge.

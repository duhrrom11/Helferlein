# Credentialed Wishlist browser smoke: trust boundary

Reviewed 2026-11-12. The workflow `.github/workflows/wishes-authenticated-live.yml` previously ran on same-repository pull requests and injected `WISHES_EXISTING_USER_EMAIL` and `WISHES_EXISTING_USER_PASSWORD` into code checked out from the PR. A collaborator with branch write access could modify `amazon-wishlist/authenticated-live-smoke.mjs` or its dependencies and exfiltrate secrets. The fork-only guard does not protect against this scenario.

## Change

- Remove the `pull_request` trigger entirely. Keep `workflow_dispatch` only.
- Gate the secret-bearing job to `refs/heads/main`, so manual runs of unreviewed feature branches do not receive credentials.
- Set checkout `persist-credentials: false`.
- Keep existing missing-secret fail-closed check and read-only REST write blocker.

## Operating procedure

After a reviewed merge to protected `main`, manually dispatch **Wishes authenticated live read-only smoke** on `main`. Verify the job succeeds. This is now a **post-merge manual verification**, not a required pre-merge PR gate. Keep branch protection and mandatory non-secret tests for PRs. Rotate existing smoke account credentials if there is evidence they were exposed, and use a dedicated low-privilege account where feasible. The script still contacts the production Auth service to sign in and out; it blocks non-read REST methods but does not provide a universal guarantee against all side effects (e.g. Auth audit events).

## Independent CI issue

PR #307 has a failing `Amazon wishlist checks` browser job (six failures: five missing DOM nodes during `mountListsDashboard` and one missing mobile bulk toolbar). Do not merge #307 until repaired and rerun. The duplicate Node test removal is not a direct explanation for those browser failures.

No production database data or secrets were changed by this workflow hardening.

# P2 GitHub Actions audit — 2026-11-12

Inspected workflow definitions: `amazon-wishlist.yml`, `release-smoke.yml`, `production-routes.yml`, `live-site-http.yml`, `live-host-reachability.yml`, `night-coordinator.yml`, `openai-draft-pr-agent.yml`, `openai-readonly-agent.yml`, `backup-policy.yml`, `wishes-authenticated-live.yml`, `static-repository-checks.yml`, `b3-startseite.yml`.

## Applied low-risk CI improvement

- `amazon-wishlist.yml` previously ran six individual Node tests with `continue-on-error: true` and then the full `node --test --test-concurrency=1 amazon-wishlist/*.test.mjs` gate. Removed the redundant six runs; the full gate still runs **all** matching test files and fails on test failure.
- Added per-PR/ref concurrency with `cancel-in-progress: true` to stop superseded Wishlist CI runs; unrelated PRs remain independent.
- Disabled persisted checkout credentials in both jobs.
- No changes to test files, application behavior, deployment or Supabase.

## Risk requiring separate handling

`wishes-authenticated-live.yml` injects existing-account credentials into a test run on same-repository pull requests. The fork guard prevents untrusted fork PRs but does not protect against malicious or compromised users with write access to the same repository: they can potentially change test code executed in the privileged job. Do not claim the workflow is secure solely because forks are excluded. Recommended follow-up: use a dedicated low-privilege nonproduction account, avoid production secrets in PR-triggered code, or run privileged checks only from a protected trusted ref after review. Changing this gate needs careful coordination to preserve intended release protection.

## Additional observations

- `openai-draft-pr-agent.yml` is manual-only and has `contents: write` / `pull-requests: write`; its output allowlist should remain enforced.
- `night-coordinator.yml` is scheduled daily and has `issues: write`, matching its reporting intent.
- `release-smoke.yml` and `production-routes.yml` run overlapping but distinct checks; no deletion recommended without coverage comparison.
- `live-site-http.yml` runs on deployment status and weekly schedule; it verifies public routes and is not a deployment mechanism.
- Existing `pages-build-deployment` runs were successful; exact Pages source directory remains unverified without Settings → Pages access.
- `static-repository-checks.yml` passed PR #306.

## Verification

Review the pull request's `Amazon wishlist checks` workflow. Confirm both `checks` and `browser` jobs pass before merging. No production data or test accounts were created.

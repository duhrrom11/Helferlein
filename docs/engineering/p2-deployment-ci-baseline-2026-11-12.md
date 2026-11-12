# P2: Deployment and CI baseline (2026-11-12)

## Observed

- Repository: `duhrrom11/Helferlein` (public), default branch `main`.
- Root contains `index.html`, `.nojekyll`, and `AGENTS.md`.
- No root `package.json`; frontend includes static HTML/CSS/JavaScript.
- `README.md` still mentions Firebase/Firestore while the Wishlist and other backend features use Supabase. A full per-tool inventory is needed before replacing the README's tech stack.
- The configured GitHub Pages publishing source and existing workflows were **not conclusively retrieved**; do not replace deployment configuration without checking GitHub Settings → Pages.

## Implemented

- Added `.github/workflows/static-repository-checks.yml`.
- Runs on pull requests and manual dispatch only. Does **not** run on pushes or deploy.
- Uses read-only GitHub token permissions; no database credentials or external services.
- Checks for required entrypoint, `.nojekyll`, `AGENTS.md`, whitespace errors and unresolved merge conflict markers in source files.
- No dependencies installed, no production writes.

## Follow-ups

1. Confirm actual GitHub Pages source in Settings → Pages and inspect Actions history.
2. Expand CI incrementally with HTML validation and JavaScript syntax checks after identifying all relevant file conventions and avoiding false positives.
3. Update README with accurate per-tool technology inventory.
4. Avoid switching Pages source or adding a deployment workflow until existing publishing mode is verified.
5. Supabase Auth leaked-password protection remains disabled per latest Security Advisor; requires Auth dashboard configuration, not a SQL migration.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

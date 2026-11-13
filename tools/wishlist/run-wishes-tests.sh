#!/usr/bin/env bash
# Run only on a local checkout of feature/amazon-wishlist-foundation.
# Does not access Supabase, deploy, merge, or modify the production database.
set -euo pipefail
cd "$(dirname "$0")"
echo "Node: $(node --version)"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'not a git checkout')"
node --test bulk-helpers.test.mjs bulk-workflows.test.mjs
if [[ "${1:-}" == "--browser" ]]; then
  if [[ ! -x node_modules/.bin/playwright ]]; then
    echo "Browser runner missing. In this directory run npm ci --ignore-scripts --no-audit --no-fund after committing a verified package-lock.json." >&2
    exit 2
  fi
  ./node_modules/.bin/playwright test --config playwright.config.mjs
fi

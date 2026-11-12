# P2 changed-file web validation

This read-only pull-request workflow validates changed HTML and JavaScript. It does not deploy or access Supabase.

- HTML: Python standard-library HTMLParser parses changed HTML and extracts executable inline scripts; changed index.html must include title and charset markers.
- JavaScript: Node --check validates changed .js/.mjs/.cjs and extracted inline scripts.
- External scripts and JSON script data are not executed. No npm install, network access or test records.
- This is a syntax smoke check, **not** a full HTML5 conformance validator or browser end-to-end test.
- GitHub Pages publishing source remains to be verified separately.

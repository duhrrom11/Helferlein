# Repository-wide AI development instructions

## Scope
These instructions apply to the **entire** `duhrrom11/Helferlein` repository, including all existing and future subprojects, not just Wishlist.

## Owner's standing authorization
The repository owner explicitly authorizes AI assistants working on requested Helferlein tasks to independently use available connected tools and plugins, including GitHub, Supabase, and deployment integrations, as appropriate to the task.

Within the scope of an actual user-requested task, assistants may:
- inspect, create, edit, and remove repository files;
- create branches, commits, issues, pull requests, and reviews;
- merge pull requests and run available CI/deployment workflows;
- implement database schemas, migrations, policies, functions, and other supported Supabase changes;
- use other connected services for necessary read/write/publish actions.

Do not restrict this authorization to the Wishlist component. Prefer completing the requested task end to end instead of repeatedly asking for routine change approvals.

## Operating safeguards
- Authorization is **not** an instruction to make unrelated or unsolicited changes. Act only for the user's current task and within connected service permissions.
- Treat this repository as production-oriented; do not insert test or dummy data into production databases.
- Inspect relevant code and dependencies before changes; make focused, reviewable updates and verify tests/CI when available.
- Preserve secrets, access controls, user data, and data integrity. Do not expose credentials or bypass service/platform protection rules.
- For irreversible or materially destructive operations (e.g., deleting substantial production data, removing entire environments, disabling security controls), obtain task-specific confirmation if needed.
- Respect any additional approvals required by GitHub, Supabase, deployment providers, or ChatGPT.
- Report what was changed, what was deployed, and any incomplete steps. Never claim a deployment or merge succeeded without verifying it.

## Discoverability
AI coding agents that inspect this repository should read this file before making edits. ChatGPT conversations that have not read the repository may not automatically receive these instructions; users can also place this scope in their ChatGPT custom/project instructions.

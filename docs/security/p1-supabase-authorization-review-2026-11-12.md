# P1 Supabase security audit — 2026-11-12

Project: `avapuibsidubuzxjtyld`. Audit based on read-only live Postgres catalog queries and Supabase Security Advisor.

## Nine authenticated SECURITY DEFINER RPCs

All nine are owned by `postgres`, have `search_path = ''`, and grant EXECUTE to `authenticated` and `service_role`, not `anon`. Their authenticated access is intentional: `public.wishlist_gift_reservations` has RLS enabled, no policies, and no direct grants to `authenticated`.

| Function | Authorization reviewed |
| --- | --- |
| `wishlist_cancel_wish_reservation(bigint)` | Requires auth.uid; deletes only own reservation. |
| `wishlist_close_gift_year(integer,boolean)` | Requires auth.uid, explicit confirmation, valid year; snapshots only caller-owned data. |
| `wishlist_gift_dashboard_reservations()` | Requires auth.uid; aggregates caller's reservations and plans. |
| `wishlist_my_gift_coordination(integer)` | Requires auth.uid; filters caller-owned plans and caller's reservations; limit capped. |
| `wishlist_my_gift_reservations(integer,timestamptz,bigint)` | Requires auth.uid; filters caller's reservations; hides non-public product details; limit capped. |
| `wishlist_my_reservation_for_plan(bigint)` | Requires auth.uid; caller's reservation, public wish and collection. |
| `wishlist_reservation_status(bigint[])` | Requires auth.uid; public wishes in public active collections; excludes caller-owned wishes; 100-row cap. |
| `wishlist_reserve_wish(bigint)` | Requires auth.uid; prevents own/non-public wishes; inserts only caller's reservation. |
| `wishlist_update_gift_progress(uuid,text,boolean)` | Requires auth.uid; caller-owned plans, validated status and release; deletes only own reservation. |

**Decision:** Keep authenticated EXECUTE and SECURITY DEFINER. Removing either would disrupt the intended RLS-locked reservation workflow. No cross-user read/write vulnerability confirmed by static review. The nine Supabase advisor warnings are architectural warnings, not proof of exploitation. This review does not substitute for authenticated integration tests.

## Four RLS tables without policies

- `nachlass_private.heir_assignments`
- `nachlass_private.heir_invitations`
- `nachlass_private.heir_rate_limits`
- `public.wishlist_gift_reservations`

All four have RLS enabled and no direct SELECT/INSERT/UPDATE/DELETE privileges for authenticated users; anon also lacks SELECT. Both anon and authenticated lack USAGE on `nachlass_private`. **Decision:** Preserve intentional deny-by-default design; do not add broad policies to silence advisor informational notices.

## Leaked-password protection

Security Advisor confirms `auth_leaked_password_protection` is disabled. Supabase docs state this protection is available on **Pro plan and above**. It is configured under **Authentication settings → Password Security** and checks passwords against known leaked-password lists. The connected Supabase tools do not expose Auth settings updates, so do not alter internal Auth tables via SQL.

**Remaining owner action:** Open https://supabase.com/dashboard/project/avapuibsidubuzxjtyld/auth/providers (or Authentication → Settings → Password Security), confirm plan eligibility, enable leaked-password protection, and rerun Security Advisor. If unavailable on the plan, record the limitation. Review MFA and password length separately.

## Verification / change log

- Read-only inspection of all nine live function bodies, ACLs, owners, and search paths.
- Read-only inspection of RLS flags, table grants, and private schema USAGE.
- Security Advisor rerun: 9 authenticated SECURITY DEFINER warnings, 4 RLS/no-policy informational notices, 1 leaked-password warning.
- P0 anonymous RPC revocations remain in effect.
- **No changes to production data, schema, grants, functions, policies, or Auth settings.** No test data created.
- No authenticated browser or integration test performed.

References:
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

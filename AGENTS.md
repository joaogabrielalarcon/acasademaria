# Access architecture

- Account creation, temporary password reset and deactivation use the authenticated admin-usuarios function, never MCP tools, so credentials only reach the requesting admin screen.
- Share first-access expiry and access decisions in supabase/functions/_shared/access-policy.ts; frontend and MCP import the same pure rules to avoid enforcement drift.
- Count failed username logins atomically through the server-only record_login_failure function, so concurrent requests cannot overwrite counters.
- All MCP handlers must run requireAuth before accessing data; that guard checks both profile activity and mandatory password change with caller-scoped queries.
- Preserve generated MCP functions and auth client files; regenerate the manifest after MCP source changes and publish separately.
- Render the global assistant through AuthenticatedAssistant without navigation side effects, so signed-out visitors and first-access users cannot open product actions.
- Password equivalence probes must sign out locally, never globally, to avoid revoking the caller session when a temporary password is rejected.
- Admin-issued temporary password resets must confirm the existing auth email as account creation does, so legacy invitations can use username login without email acceptance.
- Normalize username and password login inputs with shared pure helpers on client and server to tolerate pasted whitespace without changing internal password characters.- Catalog pickers (plants, supplies, suppliers) search on the server via buscar_* RPCs capped at 30 rows; never load the whole catalog when a screen opens.
- Profile and access state are fetched once per session and invalidated on logout and password change; server-side checks (RLS, MCP requireAuth) remain the enforcement.
- RLS policies wrap user-constant checks (has_role, has_any_role, is_manager_or_admin, auth.uid()) in (SELECT ...) so they run once per query; row-dependent calls stay per row.

# Feature Specification: Database Integrity — Drizzle Schema Completion & RLS Hardening

**Feature Branch**: `004-database-integrity`
**Created**: 2026-05-15
**Status**: Complete ✅ (2026-05-15)
**Spec Directory**: `specs/004-database-integrity/`

---

## Context & Background

ZaFeer is a **strictly internal management dashboard**. Only internal team members (Admin + Team Users) log into the system. The `employees` table contains HR data records only — employees are data subjects managed by the system, not system users.

This spec addresses two compounding integrity gaps discovered via live DB inspection:

1. **Schema gap**: ~11 tables exist in the live database with no corresponding Drizzle type definitions in `lib/db/`, leaving the codebase without type safety for those tables.
2. **RLS gap**: All 25 tables currently use a single `authenticated_all_access` policy (`USING (true)`) — meaning any authenticated internal user has unrestricted read/write/delete access to every table, with no role differentiation.
3. **Permission audit**: The Permissions Management page (`/permissions`) and its supporting DB functions require a full correctness audit before RLS can be safely tightened.

---

## User Scenarios & Testing

### User Story 1 — Permissions System Audit & Bug Fix (Priority: P1)

The Admin opens the Permissions Management page to assign or revoke access for a team member. Currently, behind the scenes, the DB function that checks permissions (`user_has_permission`) may be reading the wrong data format, meaning permission checks at the DB level silently fail. This story ensures the permissions pipeline is end-to-end correct before any RLS is tightened.

**Why this priority**: All RLS work in US2 and US3 depends on `user_has_permission()` being correct. Building RLS on a broken foundation would create false security or silent failures.

**Independent Test**: Admin logs in, opens Permissions page, assigns `employees.view` to a team member, saves. That team member logs in and can see the Employees page. The DB-level function `user_has_permission('employees', 'view')` called as that user returns `true`. Revoke the permission → function returns `false`.

**Acceptance Scenarios**:

1. **Given** the Admin is on the Permissions page, **When** the page loads, **Then** a list of all internal team members (not employees) is shown with their current roles and permissions.
2. **Given** a team member has `employees.view` permission saved, **When** the system evaluates that user's access, **Then** both the frontend check and the DB-level function agree on the result.
3. **Given** `user_has_permission('employees', 'view')` is called for a user who has `["employees.view"]` in their permissions, **Then** the function returns `true`.
4. **Given** `user_has_permission('employees', 'delete')` is called for a user who does NOT have that permission, **Then** the function returns `false`.
5. **Given** the Admin (role = 'admin') calls `user_has_permission` for any section/action, **Then** it returns `true`.

---

### User Story 2 — Drizzle Schema Completion (Priority: P2)

A developer working on any of the 11 uncovered tables (e.g., `transfer_procedures`, `saved_searches`, `email_queue`) currently has no TypeScript type safety. Adding types eliminates a class of runtime errors and enables proper query building.

**Why this priority**: Foundational for type-safe development. Low risk since it's additive only — no DB changes, no behavioural changes.

**Independent Test**: After implementation, `pnpm typecheck` passes with zero errors. Every table that exists in the live DB is importable from `lib/db` with correct column types.

**Acceptance Scenarios**:

1. **Given** a developer imports `transferProceduresTable` from `lib/db`, **Then** TypeScript resolves all column names and types correctly.
2. **Given** all 25 live DB tables, **When** `pnpm typecheck` runs, **Then** zero type errors related to missing or mismatched table definitions.
3. **Given** the `email_queue` table is marked as service-only, **When** it is defined in Drizzle, **Then** no frontend code imports or queries it directly.

---

### User Story 3 — RLS Hardening by Role (Priority: P3)

An internal team member with `user` role currently has the same DB-level write access as the Admin. After this story, the DB enforces the role and permission model already managed at the application level, adding a defence-in-depth layer.

**Why this priority**: Addresses a real security gap, but depends on US1 (permissions audit) being complete first. The system currently relies on application-layer guards; DB-level enforcement is additive.

**Independent Test**: A team member with only `companies.view` permission cannot INSERT, UPDATE, or DELETE rows in the `companies` table — even if they bypass the frontend and call Supabase directly. Admin can always perform all operations on all tables.

**Acceptance Scenarios**:

1. **Given** Admin is authenticated, **When** Admin performs any operation on any table, **Then** the operation succeeds (no lockout).
2. **Given** a team member has `employees.view` but not `employees.delete`, **When** they attempt to delete an employee record via direct DB call, **Then** the operation is rejected by RLS.
3. **Given** a team member has no permission for a section, **When** they attempt to SELECT from that table, **Then** the operation returns zero rows (not an error — RLS filters).
4. **Given** the `email_queue` table has no `authenticated` policy, **When** any frontend user queries it, **Then** they receive zero results (RLS blocks silently).
5. **Given** RLS policies are applied, **When** `pnpm test:rls` runs, **Then** all tests pass.

---

### Edge Cases

- What if a team member's permissions JSONB is `null` or empty `[]`? → Deny-by-default: no access to any restricted table.
- What if Admin tries to remove the only remaining admin? → Already blocked at application layer; RLS does not override this existing guard.
- What if a migration drops the old policy but the new policy has a syntax error? → Migration must be atomic: test on Supabase branch first; rollback procedure documented.
- What if `user_has_permission()` is called from a context where `auth.uid()` is null (unauthenticated)? → Function must return `false` safely.
- What happens to service-only tables (email_queue, backup_history) when the api-server (service_role) queries them? → service_role bypasses RLS entirely; no impact.

---

## Requirements

### Functional Requirements

**Permissions Audit (US1)**:
- **FR-001**: System MUST verify that `get_all_users_for_admin` RPC exists in the DB and returns all internal team members (users table) correctly.
- **FR-002**: System MUST fix `user_has_permission(section, action)` to correctly evaluate flat-array permissions stored as `["section.action"]` format, returning `true` only when the exact permission string is present.
- **FR-003**: Admin MUST be always granted `true` by `user_has_permission()` regardless of permissions array contents.
- **FR-004**: System MUST document the permissions data contract (format, validation, storage) so frontend and DB agree.

**Drizzle Schema (US2)**:
- **FR-005**: All 25 tables present in the live DB MUST have a corresponding Drizzle table definition in `lib/db/src/schema/`.
- **FR-006**: Tables classified as service-only (email_queue, backup_history, daily_alert_logs, daily_excel_logs) MUST be defined in Drizzle but flagged with a comment marking them as off-limits for frontend direct access.
- **FR-007**: `lib/db/src/schema/index.ts` MUST export all new table definitions.
- **FR-008**: `pnpm typecheck` MUST pass with zero errors after all additions.

**RLS Hardening (US3)**:
- **FR-009**: Admin (role = 'admin') MUST have unrestricted ALL access to every table via an explicit admin bypass policy.
- **FR-010**: The existing `authenticated_all_access` (USING true) policy MUST be replaced — not supplemented — on every table.
- **FR-011**: Core operational tables (companies, employees, projects, transfer_procedures, obligations, payroll) MUST enforce write operations (INSERT, UPDATE, DELETE) based on the caller's permissions.
- **FR-012**: Audit/security tables (audit_log, activity_log, login_attempts, user_sessions, security_events) MUST be read-only for non-admin users, with no DELETE allowed by any frontend role.
- **FR-013**: Service-only tables (email_queue, backup_history, daily_alert_logs, daily_excel_logs) MUST have zero `authenticated` policies — accessible only via service_role.
- **FR-014**: `saved_searches` MUST retain owner-scoped access (existing `owner_all_access` policy is correct — keep it).
- **FR-015**: All RLS migration scripts MUST be tested on a Supabase branch before applying to production.
- **FR-016**: RLS policies MUST NOT use `employees.id = auth.uid()` or any employee-to-session binding.

### Key Entities

- **User (internal team member)**: Has `role` (admin | manager | user), `permissions` (JSONB flat array), `is_active`. This is who logs in.
- **Employee (data subject)**: HR record. Has no auth relationship. Never logs in.
- **Permission**: A string in format `"section.action"` (e.g., `"employees.view"`). Stored in `users.permissions` as a JSON array.
- **RLS Policy**: A DB-level rule controlling which rows a user can access. Enforced on every query regardless of how the request arrives.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero tables in the live DB are missing from `lib/db/src/schema/` — 100% schema coverage.
- **SC-002**: `pnpm typecheck` passes with zero errors after Drizzle additions.
- **SC-003**: `user_has_permission('employees', 'view')` returns the correct boolean for 100% of test cases (correct user has it → true; user without it → false; admin → always true).
- **SC-004**: A team member with no permissions assigned cannot INSERT, UPDATE, or DELETE any record in core operational tables via direct DB call — 0 unauthorized mutations possible.
- **SC-005**: Admin can perform all operations on all tables before, during, and after RLS migration — 0 admin lockout incidents.
- **SC-006**: `pnpm test:rls` passes with 100% of tests green after RLS hardening.
- **SC-007**: Security advisor (`get_advisors`) shows zero `rls_policy_always_true` warnings after hardening.

---

## Assumptions

- The live Supabase DB is the source of truth for table structure; Drizzle additions mirror it exactly without altering schemas.
- Permissions are stored in `users.permissions` as a flat JSON array of strings (`["employees.view", "companies.create"]`) — confirmed from `update_user_as_admin` function source.
- Admin always has `role = 'admin'` in `public.users`. There is at least one admin at all times (enforced by `delete_user_as_admin` function which prevents deleting the last admin).
- RLS migrations will be tested on a Supabase branch environment before production apply.
- `pnpm test:rls` test suite exists and will be used as the primary RLS regression test.
- Service-only tables are queried exclusively via the Express api-server using service_role key, which bypasses RLS.
- The `user_has_permission()` SECURITY DEFINER function is the correct and safe mechanism for DB-level permission checks (avoids RLS recursion on `users` table).
- Drizzle is used for type definitions and schema reference; not yet used for runtime queries (Supabase client used directly in frontend).

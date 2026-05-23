# Research: حذف المشروع مع بقاء تاريخه المالي وإدارة المستخلصات

**Date**: 2026-05-23  
**Branch**: `021-project-extract-lifecycle`

## RES-001: Project deletion model

**Decision**: use `soft delete` for projects.

**Rationale**: the business action is removing the project from active operations, not destroying its financial history. Keeping the project row preserves existing joins for extracts and payroll.

**Alternatives considered**:
- Physical delete with FK changes: risks historical identity loss.
- Separate archive table: adds query complexity without business value.

---

## RES-002: Sensitive mutation boundary

**Decision**: project delete, whole extract delete, and extract line add/update/delete go through `artifacts/api-server` routes guarded by `requireAdmin`, `adminRateLimiter`, and generated Zod validation.

**Rationale**: the constitution forbids sensitive delete operations through frontend Supabase calls and requires validation/rate limiting for admin endpoints. Admin API keeps service-role usage server-side and matches the existing privileged route pattern.

**Alternatives considered**:
- Frontend `.delete()`, `.update()`, `.insert()`, or `.rpc()` for lifecycle mutations: constitution/security boundary violation.
- New generic REST layer for all domain writes: wider scope than needed.

---

## RES-003: Permission model

**Decision**: lifecycle mutations require an admin session via `requireAdmin`; frontend visibility also respects permission intent labels like `projects.delete`, `extracts.delete`, and `extracts.edit`.

**Rationale**: this reconciles the spec wording about authorized users with the constitution's admin API requirement. Non-admin users cannot execute destructive deletion or extract line lifecycle edits in this feature even if a UI permission label exists.

**Alternatives considered**:
- Permission-only API without `requireAdmin`: constitution violation.
- Admin-only UI with no permission intent check: weakens current UI permission semantics.

---

## RES-004: DB migration authority

**Decision**: `lib/db/src/schema/projects.ts` is the source of truth for `is_deleted` and `deleted_at`; DB application follows the Drizzle workflow (`drizzle-kit push` in dev or an approved production migration script derived from the same schema change).

**Rationale**: this satisfies constitution requirements for Drizzle schema/migrations and avoids treating hand-written Supabase SQL as the source of truth.

**Alternatives considered**:
- Only `supabase/migrations/*.sql`: previous analysis flagged this as a constitution conflict.
- Only Drizzle schema with no deployable migration path: leaves production rollout underspecified.

---

## RES-005: Active-employee blocker rule

**Decision**: block project deletion only when active employee rows exist with `project_id = target` and `COALESCE(is_deleted, false) = false`.

**Rationale**: historical/soft-deleted employees are not active operational blockers.

**Alternatives considered**:
- Block on any historical employee: violates the requested behavior.
- Auto-detach employees during delete: mutates HR history unnecessarily.

---

## RES-006: Historical visibility strategy

**Decision**: operational project reads filter deleted projects; historical extract/payroll reads keep resolving them.

**Rationale**: selectors and active management screens should not offer deleted projects, while historical screens need the old identity.

**Alternatives considered**:
- UI-only hiding without schema flag: incomplete and hard to audit.
- Snapshot expansion everywhere: unnecessary for the current schema.

---

## RES-007: Extract modification scope

**Decision**: extract edit means editing internal content and lines only through admin API mutations. It does not include changing `project_id`, `period_month`, or `version`.

**Rationale**: changing identity fields after creation creates accounting/versioning ambiguity.

**Alternatives considered**:
- Allow project/month changes: too much financial risk for this feature.
- Keep frontend Supabase writes for line edit/delete: violates the sensitive mutation boundary.

---

## RES-008: Whole extract deletion behavior

**Decision**: whole extract delete removes `extract_invoices` and its `extract_invoice_lines` only, and does not touch payroll tables.

**Rationale**: extract lines are subordinate to the extract; payroll records are separate history.

**Alternatives considered**:
- Soft delete extracts: more filtering surface, not requested.
- Delete lines only: leaves confusing empty headers.

---

## RES-009: Audit trail scope

**Decision**: write `activity_log` for project delete, extract delete, and extract line add/update/delete.

**Rationale**: these operations affect financial/operational records and need a visible audit trail.

**Alternatives considered**:
- Audit delete only: misses FR-013 for extract edit.
- Rely on timestamps only: not enough actor/action context.

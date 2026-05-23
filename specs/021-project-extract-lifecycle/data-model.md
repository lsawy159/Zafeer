# Data Model: حذف المشروع مع بقاء تاريخه المالي وإدارة المستخلصات

**Date**: 2026-05-23  
**Branch**: `021-project-extract-lifecycle`

## Modified Entity: Project

**Source of truth**: `lib/db/src/schema/projects.ts`

Add:

```ts
is_deleted: boolean // default false, not null
deleted_at: Date | null
```

Rules:
- `is_deleted = false`: operational project.
- `is_deleted = true`: hidden from operations, still usable as historical reference.
- `is_deleted` defaults to `false` and must not be nullable.
- `deleted_at` is set when admin deletion succeeds.
- `status` remains unchanged.
- No restore flow is part of this feature.

## Related Entity: Employee

Deletion blocker query:

```sql
project_id = :projectId
AND COALESCE(is_deleted, false) = false
```

Only matching active employees block project deletion.
The blocker check and project soft delete must be performed as one guarded server-side operation so a project cannot be deleted if an active employee becomes linked before deletion completes.

## Related Entity: Extract Invoice

No structural change.

Rules:
- `project_id` remains required because project rows are soft-deleted, not physically deleted.
- Extracts remain visible when their project has `is_deleted = true`.
- Whole extract delete removes the invoice row.
- Edit does not change `project_id`, `period_month`, or `version`.

## Related Entity: Extract Invoice Line

No structural change.

Rules:
- Lines remain subordinate to `extract_invoices`.
- Whole extract delete removes lines through existing cascade behavior.
- Add/update/delete line operations are considered extract edit operations for audit.
- Add/update/delete line mutations must go through admin API routes; the frontend must not write directly to `extract_invoice_lines`.

## Related Entity: Payroll Entry

No structural change.

Rules:
- Project soft delete must not update payroll rows.
- Historical payroll displays continue using existing snapshots and project references.

## Related Entity: Activity Log

Use existing `activity_log` shape from `lib/db/src/schema/audit.ts`.

Required lifecycle events:
- `project.soft_delete`
- `extract.delete`
- `extract.line_add`
- `extract.line_update`
- `extract.line_delete`

Minimum details:
- actor user id
- entity type
- entity id
- action
- timestamp
- relevant contextual fields in `details`

## API Models

### Delete Project Response

```ts
type DeleteProjectResponse = {
  success: true
  projectId: string
}
```

Errors:
- `401` authentication required
- `403` admin required
- `404` project not found
- `409` project has active employees
- `429` admin rate limit exceeded

### Delete Extract Response

```ts
type DeleteExtractResponse = {
  success: true
  extractId: string
}
```

Errors:
- `401` authentication required
- `403` admin required
- `404` extract invoice not found
- `429` admin rate limit exceeded

### Add Extract Line Request

```ts
type AddExtractLineRequest = {
  employeeId: string
  attendanceDays: number
}
```

### Update Extract Line Request

```ts
type UpdateExtractLineRequest = {
  attendanceDays: number
}
```

### Extract Line Mutation Response

```ts
type ExtractLineMutationResponse = {
  success: true
  invoiceId: string
  lineId: string
  totalAmount: number
}
```

Errors:
- `401` authentication required
- `403` admin or `extracts.edit` permission required
- `404` extract invoice, extract line, employee, or rate not found
- `409` edit not allowed for the current extract state
- `429` admin rate limit exceeded

## Read Rules

Operational project reads:

```sql
WHERE COALESCE(is_deleted, false) = false
```

Historical extract/payroll reads must not apply that filter when resolving old project identity.

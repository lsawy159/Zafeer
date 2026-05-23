# Contract: Project Lifecycle

## API Contract

### `DELETE /admin/projects/{id}`

Purpose: soft-delete a project from active operations while preserving financial history.

Auth:
- Bearer token required.
- Route must use `requireAdmin`.
- Server must require `projects.delete` in addition to admin access.
- UI should expose the action only for admin users with `projects.delete`.

Path params:

```ts
{
  id: string
}
```

Success:

```json
{
  "success": true,
  "projectId": "uuid"
}
```

Errors:

`401` missing or invalid bearer token:

```json
{ "error": "Authentication required" }
```

`403` admin access or `projects.delete` permission required:

```json
{ "error": "Admin access or projects.delete permission required" }
```

`404` project not found:

```json
{ "error": "project not found" }
```

`409` project has active employees:

```json
{ "error": "project has active employees" }
```

`429` admin rate limit exceeded:

```json
{ "error": "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً." }
```

## Business Contract

Preconditions:
- Project exists.
- Project is not already soft-deleted.
- No active employees are attached.

Side effects:
- `projects.is_deleted = true`
- `projects.deleted_at = now()`
- `activity_log` row with `project.soft_delete`
- no changes to `extract_invoices`
- no changes to payroll tables

## Frontend Contract

Operational UI:
- Hide deleted projects from project management, selectors, imports, transfers, and operational search.
- Hide destructive delete buttons unless admin and permission intent checks pass.

Historical UI:
- Keep showing old extract/payroll records even when their project is deleted operationally.

# Contract: Extract Management

## API Contract

### `DELETE /admin/extracts/{id}`

Purpose: delete a whole extract invoice and its lines without touching payroll history.

Auth:
- Bearer token required.
- Route must use `requireAdmin`.
- Server must require `extracts.delete` in addition to admin access.
- UI should expose the action only for admin users with `extracts.delete`.

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
  "extractId": "uuid"
}
```

Errors:

`401` missing or invalid bearer token:

```json
{ "error": "Authentication required" }
```

`403` admin access or `extracts.delete` permission required:

```json
{ "error": "Admin access or extracts.delete permission required" }
```

`404` extract invoice not found:

```json
{ "error": "extract invoice not found" }
```

`429` admin rate limit exceeded:

```json
{ "error": "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً." }
```

## Edit Contract

Auth:
- Line add/update/delete mutations must go through admin API routes guarded by `requireAdmin`, `adminRateLimiter`, generated Zod validation, and server-side `extracts.edit` checks.
- UI should expose edit actions only for admin users with `extracts.edit`.
- Users without `extracts.edit` must see a clear Arabic permission rejection and must not be able to save line changes.

### `POST /admin/extracts/{id}/lines`

Purpose: add a line to an existing extract without changing the extract project, month, or version.

Path params:

```ts
{
  id: string
}
```

Request body:

```ts
{
  employeeId: string
  attendanceDays: number
}
```

Success:

```json
{
  "success": true,
  "invoiceId": "uuid",
  "lineId": "uuid",
  "totalAmount": 12500
}
```

Errors:
- `401` missing or invalid bearer token
- `403` admin or `extracts.edit` permission required
- `404` extract invoice or employee/rate not found
- `409` edit not allowed for the current extract state
- `429` admin rate limit exceeded

### `PATCH /admin/extract-lines/{lineId}`

Purpose: update attendance/amount fields for an existing extract line and recalculate invoice totals.

Path params:

```ts
{
  lineId: string
}
```

Request body:

```ts
{
  attendanceDays: number
}
```

Success:

```json
{
  "success": true,
  "invoiceId": "uuid",
  "lineId": "uuid",
  "totalAmount": 12500
}
```

Errors:
- `401` missing or invalid bearer token
- `403` admin or `extracts.edit` permission required
- `404` extract line not found
- `409` edit not allowed for the current extract state
- `429` admin rate limit exceeded

### `DELETE /admin/extract-lines/{lineId}`

Purpose: delete one extract line and recalculate invoice totals without deleting the invoice or payroll history.

Path params:

```ts
{
  lineId: string
}
```

Success:

```json
{
  "success": true,
  "invoiceId": "uuid",
  "lineId": "uuid",
  "totalAmount": 12500
}
```

Errors:
- `401` missing or invalid bearer token
- `403` admin or `extracts.edit` permission required
- `404` extract line not found
- `409` edit not allowed for the current extract state
- `429` admin rate limit exceeded

Supported edit scope:
- Add extract line.
- Update extract line attendance/amount.
- Delete extract line.
- Recalculate invoice totals.
- Write `activity_log` for each add/update/delete line mutation.

Out of scope:
- Change `project_id`.
- Change `period_month`.
- Change `version`.

## Delete Side Effects

- Delete row from `extract_invoices`.
- Delete dependent `extract_invoice_lines` through cascade.
- Write `activity_log` with `extract.delete`.
- Do not modify `payroll_runs`.
- Do not modify `payroll_entries`.
- Do not modify `payroll_entry_components`.

## Historical Contract

Extract detail/list pages must keep working when the related project has `is_deleted = true`.

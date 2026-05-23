# Quickstart: تنفيذ حذف المشروع التشغيلي وإدارة المستخلصات

**Branch**: `021-project-extract-lifecycle`  
**Date**: 2026-05-23

## Recommended Order

```text
1. Update Drizzle schema in lib/db
2. Apply DB change through Drizzle workflow
3. Add OpenAPI contracts
4. Regenerate api-zod and api-client-react
5. Add admin API routes with rate limiting and generated validation
6. Update frontend delete flows and visibility gates
7. Tighten operational project reads
8. Verify typecheck, API spec lint, and smoke flow
```

## 1. DB Schema

Update:

```text
lib/db/src/schema/projects.ts
```

Add:

```text
is_deleted boolean default false not null
deleted_at timestamp with timezone nullable
```

Apply the database change using the project-approved Drizzle workflow:

```text
pnpm --filter @workspace/db run push
```

For production rollout, use the approved migration script generated or reviewed from the same Drizzle schema change. Do not use Supabase Dashboard manual edits.

## 2. OpenAPI and Generated Types

Update:

```text
lib/api-spec/openapi.yaml
```

Add:

```text
DELETE /admin/projects/{id}
DELETE /admin/extracts/{id}
POST /admin/extracts/{id}/lines
PATCH /admin/extract-lines/{lineId}
DELETE /admin/extract-lines/{lineId}
```

Required generated schemas:
- delete project/extract path params and success responses
- add extract line body: `employeeId`, `attendanceDays`
- update extract line body: `attendanceDays`
- extract line mutation success response: `success`, `invoiceId`, `lineId`, `totalAmount`
- lifecycle error responses: `401`, `403`, `404`, `409` where applicable, and `429`

Then regenerate:

```text
pnpm orval
```

## 3. Admin API

Create:

```text
artifacts/api-server/src/routes/projectLifecycle.ts
```

Register in:

```text
artifacts/api-server/src/routes/index.ts
```

Required behavior:
- all routes use `requireAdmin`
- project delete route rejects admin users without `projects.delete`
- extract delete route rejects admin users without `extracts.delete`
- extract line mutation routes reject admin users without `extracts.edit`
- all admin lifecycle routes use `adminRateLimiter`
- all params/bodies are validated with generated Zod schemas before mutation
- project delete checks active employees
- project delete writes `projects.is_deleted` and `projects.deleted_at`
- extract delete deletes only the extract and dependent lines
- extract line add/update/delete routes recalculate totals and write `activity_log`
- delete routes write `activity_log`

## 4. Frontend

Project delete:

```text
artifacts/zafeer/src/pages/Projects.tsx
artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx
```

Extract delete/edit:

```text
artifacts/zafeer/src/hooks/useExtracts.ts
artifacts/zafeer/src/hooks/useExtractLines.ts
artifacts/zafeer/src/pages/Extracts.tsx
artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx
```

Visibility gates:
- hide destructive delete actions unless user is admin and has relevant permission
- hide or reject extract edit actions unless user has `extracts.edit`
- show Arabic 403/error copy if server rejects
- do not call Supabase directly from the frontend for `extract_invoice_lines` insert/update/delete

## 5. Operational Project Filtering

Filter deleted projects from active selectors/search/import flows:

```text
artifacts/zafeer/src/hooks/useProjects.ts
artifacts/zafeer/src/components/projects/ProjectStatistics.tsx
artifacts/zafeer/src/components/layout/GlobalSearchModal.tsx
artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx
artifacts/zafeer/src/components/employees/EmployeeCard.tsx
artifacts/zafeer/src/components/import-export/ImportTab.tsx
artifacts/zafeer/src/components/import-export/TransferProceduresTab.tsx
artifacts/zafeer/src/components/import-export/TransferProceduresExcelImport.tsx
artifacts/zafeer/src/pages/ImportExport.tsx
```

Do not apply this filter to historical extract/payroll displays that need to resolve old project identity.

## 6. Verification

Run:

```text
pnpm --filter @workspace/api-spec run lint
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/zafeer run typecheck
pnpm -r run build
```

Manual smoke:
1. Delete project with active employee: rejected with clear Arabic message.
2. Delete project with only historical extracts/payroll: succeeds and hides project operationally.
3. Historical extracts/payroll still display the deleted project identity.
4. Deleted project is absent from active selectors/import/search.
5. Delete extract: removes only the extract and its lines.
6. Edit extract line: logs audit and does not change project/month/version.
7. Admin user without `projects.delete` cannot delete a project through UI or direct API call and sees clear Arabic permission copy.
8. User without `extracts.edit` cannot save extract line changes through UI or direct API call and sees clear Arabic permission copy.
9. User without `extracts.delete` cannot delete an extract through UI or direct API call and sees clear Arabic permission copy.
10. Code review confirms no frontend Supabase insert/update/delete remains for `extract_invoice_lines`.
11. Before/after counts for extracts and payroll records tied to the deleted project match exactly after project deletion.

# Implementation Plan: حذف المشروع مع بقاء تاريخه المالي وإدارة المستخلصات

**Branch**: `021-project-extract-lifecycle` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/021-project-extract-lifecycle/spec.md`

## Summary

تحويل حذف المشروع من حذف فعلي إلى حذف تشغيلي `soft delete`: المشروع يختفي من القوائم والاختيارات التشغيلية، لكنه يظل موجودًا كمرجع تاريخي للمستخلصات والرواتب. عمليات الحذف وتعديلات أسطر المستخلص الحساسة تمر عبر `artifacts/api-server` تحت `requireAdmin` مع `adminRateLimiter` وZod validation وعقود OpenAPI وhooks مولدة. الواجهة لا تستدعي Supabase مباشرة للحذف أو لتعديل/حذف أسطر المستخلص، لكنها تستمر في قراءة بيانات الدومين من Supabase. صلاحيات `projects.delete` و`extracts.delete` و`extracts.edit` يجب فرضها server-side داخل مسارات admin بجانب استخدامها لإظهار/إخفاء عناصر الواجهة.

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19.1 / Node.js / Express  
**Primary Dependencies**: Supabase JS v2, TanStack React Query v5, React Router, Drizzle ORM, Express, Zod, Orval  
**Storage**: PostgreSQL on Supabase. Schema authority in `lib/db/src/schema`; DB changes start from Drizzle schema and are applied by `drizzle-kit push` in dev or an approved production migration script generated from the same schema change  
**Testing**: `pnpm --filter @workspace/api-spec run lint`, `pnpm --filter @workspace/api-server run typecheck`, `pnpm --filter @workspace/zafeer run typecheck`, `pnpm -r run build`, manual smoke from `quickstart.md`  
**Target Platform**: RTL Arabic web SPA in `artifacts/zafeer` + internal admin API in `artifacts/api-server`  
**Project Type**: Monorepo web application with Supabase reads and admin API for privileged mutations  
**Performance Goals**: حذف المشروع أو المستخلص ينعكس في الواجهة بعد refresh/query invalidation واحد دون كسر الشاشات التاريخية  
**Constraints**: لا فقد للتاريخ المالي، لا `service_role` في frontend، لا direct frontend Supabase mutation لحذف أو تعديل أسطر المستخلص، حذف المشروع يمنع فقط عند وجود موظفين نشطين، حذف المستخلص لا يلمس payroll، تعديل المستخلص لا يغير `project_id` أو `period_month` أو `version`  
**Scale/Scope**: `projects`, `employees`, `extract_invoices`, `extract_invoice_lines`, `payroll_entries`, `activity_log`, OpenAPI contracts, generated hooks, and project selectors across the frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Supabase-First Data Layer** | PASS | Domain reads stay direct through Supabase. Sensitive lifecycle mutations use admin API because the constitution reserves privileged mutations for `artifacts/api-server` |
| **II. Arabic UX - RTL First** | PASS | Confirmation, blocking, and error messages remain Arabic and RTL |
| **III. Type Safety Throughout** | PASS | API changes begin in `lib/api-spec/openapi.yaml`, then regenerate `lib/api-zod` and `lib/api-client-react`; DB types come from `lib/db` |
| **IV. Security via Supabase RLS** | PASS | Project/extract lifecycle mutations are not exposed as frontend Supabase writes; admin routes use `requireAdmin`, `adminRateLimiter`, generated Zod validation, and service-role stays server-side |
| **V. Monorepo Package Discipline** | PASS | Endpoint order is `api-spec` -> `api-zod` -> `api-client-react` -> `api-server`; schema work stays in `lib/db` |
| **VI. Brand Identity & Naming Discipline - ZaFeer** | PASS | No legacy naming introduced |
| **VII. Internal System Architecture - Users vs Employees** | PASS | Employees are HR records only; deletion blocker queries `employees`, not auth users |
| **VIII. Notification Threshold Single Source** | PASS | Out of scope |

**Gate result**: PASS

## Project Structure

### Documentation

```text
specs/021-project-extract-lifecycle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── extract-management.md
│   └── project-lifecycle.md
└── tasks.md
```

### Source Code

```text
lib/db/src/schema/
├── projects.ts                         # MODIFY - add is_deleted/deleted_at
└── audit.ts                            # REFERENCE - activity_log shape

lib/api-spec/
└── openapi.yaml                        # MODIFY - admin project/extract lifecycle endpoints

lib/api-zod/src/generated/              # REGENERATE via pnpm orval
lib/api-client-react/src/generated/     # REGENERATE via pnpm orval

artifacts/api-server/src/
├── routes/
│   ├── index.ts                        # MODIFY - register lifecycle route
│   └── projectLifecycle.ts             # NEW - admin project/extract delete + extract line mutation routes
├── middleware/
│   ├── auth.ts                         # REFERENCE - requireAdmin
│   └── rateLimit.ts                    # REFERENCE - adminRateLimiter
└── lib/supabaseAdmin.ts                 # REFERENCE - service-role client

artifacts/zafeer/src/
├── lib/supabase.ts                     # MODIFY - Project type soft-delete fields
├── hooks/
│   ├── useProjects.ts                  # MODIFY - operational reads exclude deleted projects
│   ├── useExtracts.ts                  # MODIFY - generated delete extract hook integration
│   └── useExtractLines.ts              # MODIFY - generated admin mutation hooks for line add/update/delete
├── pages/
│   ├── Projects.tsx                    # MODIFY - generated admin delete project mutation
│   ├── Extracts.tsx                    # MODIFY - delete extract affordance
│   ├── ImportExport.tsx                # REVIEW/MODIFY - project selector filtering
│   └── extracts/ExtractDetail.tsx      # MODIFY - delete extract + edit-scope messaging
└── components/
    ├── projects/ProjectDetailModal.tsx
    ├── projects/ProjectStatistics.tsx
    ├── projects/ProjectModal.tsx
    ├── employees/AddEmployeeModal.tsx
    ├── employees/EmployeeCard.tsx
    ├── import-export/ImportTab.tsx
    ├── import-export/TransferProceduresTab.tsx
    ├── import-export/TransferProceduresExcelImport.tsx
    └── layout/GlobalSearchModal.tsx
```

**Structure Decision**: keep Supabase as the read layer. Use admin API for sensitive lifecycle mutations: project delete, whole extract delete, and extract line add/update/delete. Update `lib/db` as schema source first, then use the project-approved Drizzle workflow for applying DB changes. Any production SQL script must be treated as deploy output for the Drizzle/schema change, not as a hand-edited source of truth.

## Phase 0: Research Decisions

1. Project deletion is `soft delete`.
2. Active employees are the only project deletion blocker, and the blocker check must be guarded with the soft delete so a concurrent active employee link cannot slip through.
3. Historical extract/payroll views must keep resolving deleted projects.
4. Admin lifecycle routes require `requireAdmin`, `adminRateLimiter`, generated Zod validation, and server-side checks for `projects.delete`, `extracts.delete`, or `extracts.edit` as appropriate; UI visibility also checks the same permission.
5. DB schema source is `lib/db`; no manual dashboard edits and no Supabase RPC delete path from frontend.
6. Extract edit scope is internal content/lines only; no project, month, or version changes; line add/update/delete mutations go through the admin API, not frontend Supabase writes.
7. `activity_log` records project delete, extract delete, and extract line add/update/delete inside the server-side admin mutation flow.

## Phase 1: Design Artifacts

### Data Model

- `projects`: add `is_deleted default false not null`, `deleted_at nullable`
- `extract_invoices`: no structural change
- `extract_invoice_lines`: no structural change
- `activity_log`: reuse existing shape for lifecycle events

### API Contracts

- `DELETE /admin/projects/{id}`
- `DELETE /admin/extracts/{id}`
- `POST /admin/extracts/{id}/lines`
- `PATCH /admin/extract-lines/{lineId}`
- `DELETE /admin/extract-lines/{lineId}`

### Frontend Contracts

- Use generated hooks from `@workspace/api-client-react` for destructive delete and extract line add/update/delete mutations.
- Server must reject project delete unless the admin session has `projects.delete`.
- Server must reject extract delete unless the admin session has `extracts.delete`.
- Server must reject extract line add/update/delete unless the admin session has `extracts.edit`.
- Hide destructive delete actions unless the user is admin and has the matching permission.
- Hide or reject extract edit actions unless the admin session has `extracts.edit`.
- Operational project selectors filter deleted projects.
- Historical views do not filter out deleted projects when resolving old records.

## Post-Design Constitution Re-check

| Area | Result | Note |
|------|--------|------|
| Sensitive mutation boundary | PASS | Admin API with `requireAdmin`, `adminRateLimiter`, and Zod validation; no frontend Supabase delete/edit mutations for project/extract lifecycle |
| Migration authority | PASS | `lib/db` schema is source; Drizzle workflow applies DB change |
| API type flow | PASS | OpenAPI -> generated Zod/hooks -> API server |
| Permission model | PASS | Admin gate plus server-side permission checks and permission-aware UI; spec clarified |
| Audit trail | PASS | Project delete, extract delete, and extract line add/update/delete have explicit implementation targets |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

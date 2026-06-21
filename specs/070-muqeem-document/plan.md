# Implementation Plan: Employee Muqeem Document File Attachment

**Branch**: `070-muqeem-document` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/070-muqeem-document/spec.md`

## Summary

Add **one** document-only file attachment per employee — **Muqeem Document** (`muqeem_document_url`) — by **extending the already-merged feature 069 pattern** (Health Certificate / Ajeer Contract). The existing generic registry `EMPLOYEE_DOC_TYPES` and its consumers (`EmployeeDocumentField`, `EmployeeDocViewer`, `useEmployeeDocFile`) are reused as-is; we add a third entry `muqeem` and a parallel wiring block at each site that currently hardcodes `health`/`ajeer`. Its signed URL becomes one clickable Excel export column ("رابط ملف وثيقة مقيم"); the column stays out of import + template. No new bucket, no new RLS, no crop/avatar/thumbnail.

**Technical approach**: one additive Drizzle migration (1 nullable TEXT column). Add `muqeem` to `EMPLOYEE_DOC_TYPES`, the `EmployeeDocColumn` union, and the `folder` union in `lib/employeeDocFile.ts`. Then mirror the existing `health`/`ajeer` wiring (one new sibling block, never a rewrite) across: the `Employee` type, the Drizzle schema, every employee `.select(...)` string that already lists `health_certificate_url`, the EmployeeCard edit+view, the AddEmployeeModal pending-upload flow, the Excel export (path collection + row key + hyperlink header + `!cols` width), and the import preview hide-rule. Residence and the existing 069 health/ajeer logic are **never edited in place** — only sibling additions.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Node via pnpm monorepo
**Primary Dependencies**: Supabase JS client (storage + postgrest), `@tanstack/react-query`, `sonner` (toasts), `xlsx` (lazy via `loadXlsx`), `file-saver`, Drizzle ORM (`drizzle-orm/pg-core`, `drizzle-zod`), `lucide-react`
**Storage**: Supabase Postgres (`public.employees`) + existing private bucket `employee-documents` (500 KB; MIME jpeg/png/webp/pdf); new subfolder `muqeem-document/`
**Testing**: Vitest unit (`artifacts/zafeer/tests/unit`), Playwright e2e (`e2e/playwright`)
**Target Platform**: Web (Vite SPA), RTL Arabic UI, Gulf market
**Project Type**: Web application (frontend-direct-to-Supabase per Constitution I)
**Performance Goals**: Upload/view a file in under 1 minute (SC-001); export does not block UI
**Constraints**: File ≤ 500 KB; signed URLs 7-day for export (604800s), 1-hour in-app viewer (3600s); no regression to Residence or 069 (SC-005); Arabic-only UI (Constitution II)
**Scale/Scope**: One new nullable column; 0 new components/hooks/libs (reuse 069); edits to ~13 existing files + 1 migration + 2 test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First Data Layer | ✅ PASS | Reads/writes via Supabase client. New column via Drizzle schema + migration in `supabase/migrations/`. No Express layer. |
| II. Arabic UX — RTL First (SAR) | ✅ PASS | New label "وثيقة مقيم", field label "ملف وثيقة مقيم", export header "رابط ملف وثيقة مقيم", all toasts/validation Arabic. No currency. |
| III. Type Safety Throughout | ✅ PASS | New field typed in `Employee` + `EmployeeDocColumn` union + Drizzle inference. No `any`. `pnpm run typecheck` must pass. |
| IV. Security via Supabase RLS | ✅ PASS | Reuses existing `employee-documents` bucket policy keyed on `user_has_permission('employees', view\|edit)`. Path-agnostic → no new policy. No service-role in frontend. |
| V. Monorepo Package Discipline | ✅ PASS | Schema change confined to `lib/db`. No hand-edits to generated `lib/api-zod` / `lib/api-client-react` (employee data uses Supabase client + `lib/supabase.ts`, consistent with residence + 069). |
| VI. Brand Identity — ZaFeer | ✅ PASS | No legacy names. Subfolder `muqeem-document/`, column `muqeem_document_url`. "Muqeem" = the government مقيم platform (already referenced via `ending_subscription_moqeem_date`). |
| VII. Users vs Employees | ✅ PASS | Operates only on `public.employees`. No self-service, no `auth.uid()`, no FK to `auth.users`. |
| VIII. Notification Threshold Single Source | ✅ N/A | No expiry/alert logic added (document only). |

**Gate result**: PASS — no violations; Complexity Tracking not required.

Constitution SOP note (Zero-Placeholder): migration SQL is complete; all wiring sites are enumerated with concrete before/after anchors in [data-model.md](data-model.md) and [contracts/wiring-contract.md](contracts/wiring-contract.md).

## Project Structure

### Documentation (this feature)

```text
specs/070-muqeem-document/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── wiring-contract.md   # exact per-file mirror sites
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks (NOT created here)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260621120000_070_add_employee_muqeem_document.sql   # NEW: 1 nullable TEXT column

lib/db/src/schema/
└── employees.ts                     # EDIT: + muqeem_document_url after ajeer_contract_url

artifacts/zafeer/src/
├── lib/
│   ├── supabase.ts                  # EDIT: Employee interface + muqeem_document_url?: string
│   └── employeeDocFile.ts           # EDIT: + union member, + folder member, + EMPLOYEE_DOC_TYPES.muqeem
├── hooks/
│   └── useEmployees.ts              # EDIT: + col in both select strings
├── components/employees/
│   ├── EmployeeDocumentField.tsx    # UNCHANGED (reused)
│   ├── EmployeeDocViewer.tsx        # UNCHANGED (reused)
│   ├── AddEmployeeModal.tsx         # EDIT: + EmployeeDocumentField muqeem; grid 3→4 cols
│   ├── AddEmployeeModal/useAddEmployeeForm.ts  # EDIT: pending state + upload hook + post-insert select + push + reset
│   └── EmployeeCard/
│       ├── EmployeeCardInfo.tsx     # EDIT: + muqeem field block (edit + view)
│       └── useEmployeeCardLogic.ts  # EDIT: formData + pending ref/state + handler + handleSave block + handleCancel
├── components/import-export/
│   ├── ExportTab.tsx                # EDIT: + col in source select string
│   ├── ExportTab/EmployeeExport.tsx # EDIT: path flatMap + row key + linkHeaders + !cols
│   └── ImportTab/useImportBase.ts   # EDIT: + muqeem header in isColumnHidden
├── pages/ImportExport.tsx           # EDIT: select + storagePaths col loop + row key
└── tests/unit/
    ├── lib/employeeDocFile.test.ts  # EDIT: + muqeem assertions
    └── hooks/useEmployeeDocFile.test.ts  # EDIT: + muqeem upload/delete case (optional but recommended)
```

**Unchanged / verify-only**: `TemplatesTab.tsx`, `ImportTab/importTypes.ts` (`EMPLOYEE_COLUMNS_ORDER`) — already exclude file-URL columns; confirm muqeem stays absent. `lib/residenceFile.ts`, `useResidenceFile.ts`, `ResidenceFileField.tsx` — never touched (SC-005).

**Structure Decision**: Reuse the 069 generic modules; this feature is a registry extension + parallel wiring, isolating risk to additive sibling blocks. No new component/hook/lib files are created.

## Complexity Tracking

No constitution violations — section intentionally empty.

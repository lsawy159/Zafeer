---
description: "Task list for Employee Muqeem Document File Attachment"
---

# Tasks: Employee Muqeem Document File Attachment

**Input**: Design documents from `specs/070-muqeem-document/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/wiring-contract.md, quickstart.md

**Tests**: Unit tests included (mirror 069 coverage; supports SC-005 no-regression). Recommended.

**Organization**: Grouped by user story. Foundational phase is shared infrastructure blocking all stories.

**Golden rule (every task)**: ADD a sibling block mirroring the existing `health`/`ajeer` (069) code. **NEVER rewrite** residence or 069 health/ajeer logic in place. Locate the live anchor text — do not trust line numbers. Full per-site detail in [contracts/wiring-contract.md](contracts/wiring-contract.md).

Registry meta everywhere: `EMPLOYEE_DOC_TYPES.muqeem` → column `muqeem_document_url`, folder `muqeem-document`, labelAr `وثيقة مقيم`, exportHeaderAr `رابط ملف وثيقة مقيم`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1 = attach (edit+add), US2 = Excel export, US3 = import/template stays clean
- All paths relative to repo root

## Path Conventions
- Frontend: `artifacts/zafeer/src/`
- Schema: `lib/db/src/schema/`
- Migrations: `supabase/migrations/`
- Tests: `artifacts/zafeer/tests/`

---

## Phase 1: Setup

- [X] T001 Confirm branch `070-muqeem-document` checked out, working tree clean (`git status`), and `pnpm install` current. No new dependencies (reuses 069 modules + xlsx + react-query + sonner + lucide-react).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB column + schema + type + registry entry. MUST complete before ANY story. No new component/hook/lib files.

- [X] T002 Create migration `supabase/migrations/20260621120000_070_add_employee_muqeem_document.sql` adding `muqeem_document_url TEXT` to `employees` via `ADD COLUMN IF NOT EXISTS` (nullable, no default). Use exact SQL from [data-model.md](data-model.md). Timestamp MUST sort after 069's `20260621000000`. No bucket, no policy. (Constitution I.)
- [X] T003 In `lib/db/src/schema/employees.ts`, after the `ajeer_contract_url: text('ajeer_contract_url'),` line, ADD sibling `muqeem_document_url: text('muqeem_document_url'),`. Never edit the residence/health/ajeer lines.
- [X] T004 [P] In `artifacts/zafeer/src/lib/supabase.ts`, after `ajeer_contract_url?: string` in the `Employee` interface, ADD sibling `muqeem_document_url?: string`.
- [X] T005 In `artifacts/zafeer/src/lib/employeeDocFile.ts`: ADD `'muqeem_document_url'` to the `EmployeeDocColumn` union; ADD `'muqeem-document'` to `EmployeeDocMeta.folder`; widen the `EMPLOYEE_DOC_TYPES` key union to `Record<'health' | 'ajeer' | 'muqeem', EmployeeDocMeta>` and ADD the `muqeem` entry (`column:'muqeem_document_url'`, `folder:'muqeem-document'`, `labelAr:'وثيقة مقيم'`, `exportHeaderAr:'رابط ملف وثيقة مقيم'`). Do not touch the health/ajeer entries. `validateEmployeeDocFile`/`buildEmployeeDocPath` need no change.
- [X] T005a In `artifacts/zafeer/src/hooks/useEmployees.ts`: in BOTH employee `.select(...)` strings (~L20 and ~L71, each listing `...health_certificate_url,ajeer_contract_url,...`), ADD `muqeem_document_url` adjacent to `ajeer_contract_url`. **Blocking for FR-011/SC-001**: without this, EmployeeCard reads `muqeem_document_url` as `undefined` and the uploaded file disappears after reload. Add to the column list only — never edit other columns.

**Checkpoint**: DB + schema + type + registry + list read-path ready. Stories can start. (`EmployeeDocumentField`, `EmployeeDocViewer`, `useEmployeeDocFile` reused unchanged.)

---

## Phase 3: User Story 1 — Attach Muqeem Document (Priority: P1) 🎯 MVP

**Goal**: Authorized user uploads/views/replaces/deletes a Muqeem Document via drag-and-drop in EmployeeCard edit AND AddEmployeeModal, with no avatar change.

**Independent Test**: Edit an employee → drop a PDF on وثيقة مقيم → Save → reopen → viewable; avatar unchanged. Add a new employee with a وثيقة مقيم via drag-drop → attached after creation.

- [X] T006 [US1] In `artifacts/zafeer/src/components/employees/EmployeeCard/useEmployeeCardLogic.ts`: ADD sibling members mirroring `ajeer` — `muqeem_document_url: string` to `EmployeeFormData`; init `muqeem_document_url: employee?.muqeem_document_url ?? ''`; `pendingMuqeemRef` + `hasPendingMuqeem` state; `handleMuqeemReady(file)`; in `handleSave` a `pendingMuqeemRef` block using `uploadPendingDoc(file, EMPLOYEE_DOC_TYPES.muqeem, formData.muqeem_document_url)` → `actualUpdateData['muqeem_document_url']=newPath` (error toast 'فشل رفع ملف وثيقة مقيم'); `handleCancel` reset `muqeem_document_url: employee.muqeem_document_url || ''`. Expose `handleMuqeemReady`/`hasPendingMuqeem` in the hook return. Never edit the residence/health/ajeer blocks.
- [X] T007 [US1] In `artifacts/zafeer/src/components/employees/EmployeeCard/EmployeeCardInfo.tsx`: after the `{/* عقد الأجير */}` block, ADD a `{/* وثيقة مقيم */}` block — edit mode `<EmployeeDocumentField meta={EMPLOYEE_DOC_TYPES.muqeem} employeeId={employee.id} currentPath={formData.muqeem_document_url || null} disabled={false} isDeleted={employee.is_deleted ?? false} onFileReady={handleMuqeemReady} onPathChange={(p)=>setFormData({...formData, muqeem_document_url: p ?? ''})} hasPendingFile={hasPendingMuqeem} />`; view mode label "وثيقة مقيم" + `<EmployeeDocViewer path={formData.muqeem_document_url} meta={EMPLOYEE_DOC_TYPES.muqeem} />` or "لا يوجد ملف". Destructure `handleMuqeemReady`/`hasPendingMuqeem` from the logic hook. Mirror, don't rewrite.
- [X] T008 [US1] In `artifacts/zafeer/src/components/employees/AddEmployeeModal/useAddEmployeeForm.ts`: ADD sibling `pendingMuqeem`/`setPendingMuqeem` state; `const uploadMuqeem = useUploadEmployeeDoc(EMPLOYEE_DOC_TYPES.muqeem)`; add `muqeem_document_url` to the post-insert `.select(...)` string (after `ajeer_contract_url`); after the `pendingAjeer` upload push add a `pendingMuqeem` push (`label:'وثيقة مقيم'`); add `setPendingMuqeem(null)` to the reset block; expose `pendingMuqeem`/`setPendingMuqeem` if the modal reads them. Mirror the ajeer path exactly.
- [X] T009 [US1] In `artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx`: after the `{/* عقد الأجير */}` `EmployeeDocumentField`, ADD a muqeem `EmployeeDocumentField` (`meta={EMPLOYEE_DOC_TYPES.muqeem}`, `employeeId=""`, `disabled={loading}`, `onFileReady={(file)=>setPendingMuqeem(file)}`, `hasPendingFile={!!pendingMuqeem}`). Change the wrapper grid (`md:grid-cols-3`) to a layout that fits 4 fields cleanly (`md:grid-cols-2`); verify visually. Don't touch the residence/health/ajeer fields.

**Checkpoint**: US1 usable end-to-end (add + edit + view + replace + delete), no avatar impact. MVP complete.

---

## Phase 4: User Story 2 — Export Muqeem Document link to Excel (Priority: P2)

**Goal**: One new clickable column "رابط ملف وثيقة مقيم" in the employee Excel export, beside the other file links.

**Independent Test**: Export employees (some with the file, some without) → column present; rows with a file = clickable link, others empty.

- [X] T010 [US2] In `artifacts/zafeer/src/components/import-export/ExportTab.tsx`: in the source employee `.select(...)` string (the one listing `residence_image_url,health_certificate_url,ajeer_contract_url,`), ADD `muqeem_document_url,` after `ajeer_contract_url,`. This feeds `selectedData`.
- [X] T011 [US2] In `artifacts/zafeer/src/components/import-export/ExportTab/EmployeeExport.tsx`: (a) add `emp.muqeem_document_url,` to the signed-URL path `flatMap`; (b) after the `'رابط ملف عقد الأجير'` row-key IIFE, ADD a `'رابط ملف وثيقة مقيم'` IIFE (same `!p→'' / isLegacyExternalUrl→p / signedUrlMap.get(p)??''` rule) placed before `الملاحظات`; (c) add `{ header:'رابط ملف وثيقة مقيم', label:'اضغط هنا لعرض الملف', tooltip:'فتح الملف' }` to `linkHeaders`; (d) append one `{ wch: 25 }` to BOTH the monthly and basic `!cols` arrays. Mirror the ajeer column; never rewrite the residence/health/ajeer keys.

**Checkpoint**: Export delivers the new clickable column; residence + health/ajeer export unchanged.

---

## Phase 5: User Story 3 — Import & template stay free of the file-URL column (Priority: P2)

**Goal**: No Muqeem URL column in import requirements/template; re-importing an exported file ignores + hides it.

**Independent Test**: Download employee template → no وثيقة مقيم URL column. Import an exported employees file → no blocking column error; column hidden in preview; no URL written to DB.

- [X] T012 [US3] In `artifacts/zafeer/src/components/import-export/ImportTab/useImportBase.ts` `isColumnHidden`: after the `رابط ملف عقد الأجير` line, ADD `if (normalized === normalizeColumnName('رابط ملف وثيقة مقيم')) return true`. Don't touch existing rules.
- [X] T013 [US3] In `artifacts/zafeer/src/pages/ImportExport.tsx` (the page's own employee export): add `muqeem_document_url` to the `.select(...)` string (after `ajeer_contract_url`); add `'muqeem_document_url'` to the storage-path `for (const col of [...])` array; after the `'رابط ملف عقد الأجير'` row-key block ADD the `'رابط ملف وثيقة مقيم'` block (same legacy/signed rule), before `الملاحظات`. Mirror ajeer.
- [X] T014 [P] [US3] Verify (no code change expected): `artifacts/zafeer/src/components/import-export/TemplatesTab.tsx` and `ImportTab/importTypes.ts` `EMPLOYEE_COLUMNS_ORDER` contain NO Muqeem (or any) URL column. If any present, remove. Confirm employee `validateExcelColumns` treats the extra URL column as non-blocking.

**Checkpoint**: Import/template clean; round-trip of an exported file works.

---

## Phase 6: Polish & Cross-Cutting

- [X] T015 [P] In `artifacts/zafeer/tests/unit/lib/employeeDocFile.test.ts`: ADD muqeem assertions mirroring ajeer — `EMPLOYEE_DOC_TYPES.muqeem.column==='muqeem_document_url'`, `.folder==='muqeem-document'`, `.labelAr==='وثيقة مقيم'`, `.exportHeaderAr==='رابط ملف وثيقة مقيم'`, and a `buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.muqeem.folder, ...)` prefix check.
- [X] T016 [P] In `artifacts/zafeer/tests/unit/hooks/useEmployeeDocFile.test.ts`: ADD an upload-success case writing `muqeem_document_url` (mirror the ajeer case). Recommended for SC-005 parity.
- [X] T017 Run `pnpm run typecheck` (0 errors) and the unit test suite; fix any fallout. (Constitution III)
- [X] T018 Confirm SC-005 no-regression by inspection: `lib/residenceFile.ts`, `hooks/useResidenceFile.ts`, `ResidenceFileField.tsx`, `ResidenceCropModal*`, and the existing `health`/`ajeer` blocks are unchanged (only sibling additions in shared files). `git diff` shows no deletions/rewrites in residence/069 logic.
- [X] T019 Execute the manual verification checklist in [quickstart.md](quickstart.md) (SC-001..SC-005): upload via edit + add, reload viewable, export clickable column, import hides column with no blocking error, residence + health/ajeer unchanged, card avatar unchanged. Confirm NO new storage bucket or RLS policy was created (reused `employee-documents` — FR-010).

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** blocks everything.
- **US1 (Phase 3)** depends only on Foundational. = MVP.
- **US2 (Phase 4)** depends on Foundational (column + type). Independent of US1 UI; can run in parallel with US1 after Foundational.
- **US3 (Phase 5)** depends on Foundational; can run in parallel with US1/US2.
- **Polish (Phase 6)**: T015/T016 after T005; T017–T019 after all implementation.

### Foundational internal order
T002 → T003 → (T004 [P], T005, T005a). T005 (registry) needed by T006/T007/T008/T009/T011. T005a (list read-path) needed for FR-011/SC-001 view-after-reload.

### Parallel opportunities
- After Foundational: US1 (T006-09) ‖ US2 (T010-11) ‖ US3 (T012-14) — different files mostly. Note T011 & T013 both add export row keys but in different files (EmployeeExport.tsx vs ImportExport.tsx).
- Polish: T015 ‖ T016.

## Implementation Strategy

- **MVP = Phases 1+2+3 (US1)**: storing/viewing the document is the core value. Ship-able alone.
- **Increment 2 = US2** (export link).
- **Increment 3 = US3** (import/template hygiene).
- Then Polish (tests + typecheck + manual verification).

## Notes
- Do NOT modify `ResidenceFileField`, `ResidenceCropModal`, `useResidenceFile`, residence columns, or the existing 069 `health`/`ajeer` blocks — every change is an additive sibling (SC-005).
- No new permissions, alerts, dashboard stats, expiry tracking, components, hooks, or libs.
- Commit scope Arabic, no legacy brand names, e.g. `[070]: إضافة مرفق وثيقة مقيم للموظف`.

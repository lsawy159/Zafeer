# Feature Specification: Employee Muqeem Document File Attachment

**Feature Branch**: `070-muqeem-document`
**Created**: 2026-06-21
**Status**: Draft
**Input**: User description: "وثيقة مقيم (Muqeem Document) — a single document-file attachment per employee, behaving exactly like the existing document-only attachments from feature 069 (Health Certificate / Ajeer Contract): drag-and-drop upload (image/PDF ≤ 500 KB), view/replace/delete, a new nullable DB column `muqeem_document_url`, reuse of the existing private `employee-documents` bucket, a clickable Excel export column, and exclusion from import + template. Display label 'وثيقة مقيم'. No crop/avatar/thumbnail. Arabic RTL, Gulf market."

## Context (verified from current codebase)

The existing document-only attachment features (Residence File, and the 069 Health Certificate / Ajeer Contract) work as follows:

- DB columns on `employees`: `residence_image_url` + `residence_thumbnail_url` (residence, with avatar crop), and the document-only columns `health_certificate_url`, `ajeer_contract_url` (no thumbnail) added in feature 069.
- Private storage bucket `employee-documents` (500 KB limit; MIME: JPEG/PNG/WebP/PDF). RLS on `storage.objects` is **bucket-level** keyed on `user_has_permission('employees', view|edit)` — path-agnostic, so new subfolders need **no** new policy.
- Document-only validation/path lib `lib/employeeDocFile.ts`; upload/delete/signed-URL hooks in `hooks/useEmployeeDocFile.ts` (feature 069). Residence equivalents are `lib/residenceFile.ts` + `hooks/useResidenceFile.ts`.
- Document-only drag-and-drop UI in `components/employees/EmployeeDocumentField.tsx`; viewer in `components/employees/EmployeeDocViewer.tsx` (image lightbox / PDF iframe / legacy-URL download). No crop, no thumbnail.
- Used in **EmployeeCard edit mode** (`EmployeeCardInfo.tsx`, deferred upload via `useEmployeeCardLogic.handleSave`) and in **AddEmployeeModal** (`AddEmployeeModal.tsx` + `useAddEmployeeForm.ts`, deferred upload post-insert).
- Excel export (`ExportTab/EmployeeExport.tsx`) renders each file column with a 7-day signed URL as a clickable hyperlink, with a legacy-URL passthrough rule.
- Excel import (`ImportTab/useImportBase.ts`) and import template (`TemplatesTab.tsx`) **never** include file-URL columns; import preview hides them by header-text match.

This feature adds **one more** document-only attachment — **وثيقة مقيم (Muqeem Document)** — following the 069 pattern exactly, for a single document instead of two.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Attach a Muqeem Document to an employee (Priority: P1) 🎯 MVP

An HR user opens an employee, enters edit mode, and uploads a Muqeem Document file by dragging the file onto a drop zone (or clicking to pick). The file is stored as a document attachment and can later be viewed, downloaded, replaced, or deleted. The same field is available when adding a new employee.

**Why this priority**: Core value — without storing the file, nothing else matters.

**Independent Test**: Edit an employee, drop a PDF (or image) on the Muqeem Document field, save, reopen → the file is viewable/downloadable; no avatar/card image is changed. Add a new employee with a Muqeem Document via drag-drop → attached after creation.

**Acceptance Scenarios**:

1. **Given** an employee in edit mode, **When** the user drags a valid PDF onto the Muqeem Document drop zone and saves, **Then** the file is stored and shown as a viewable/downloadable document on reopen.
2. **Given** an employee in edit mode, **When** the user uploads a valid image as the Muqeem Document, **Then** the file is stored as a plain document and the employee's card avatar is **unchanged** (no crop step, no thumbnail).
3. **Given** a file over 500 KB or of a disallowed type, **When** the user selects it, **Then** an Arabic validation message appears and nothing is uploaded.
4. **Given** an existing attachment, **When** the user uploads a replacement or deletes it, **Then** the old stored file is removed and the record reference is updated.
5. **Given** the AddEmployeeModal, **When** the user attaches a Muqeem Document and creates the employee, **Then** the file is attached to the newly created employee.

### User Story 2 - Export the Muqeem Document link to Excel (Priority: P2)

A user exports employees to Excel and receives a new column — Muqeem Document File URL ("رابط ملف وثيقة مقيم") — alongside the existing file-URL columns, a clickable link when a file exists.

**Why this priority**: Lets users access the document outside the app; mirrors established, expected behavior.

**Independent Test**: Select employees (some with the file, some without) and export → the new column exists; rows with a file show a clickable link, rows without show empty.

**Acceptance Scenarios**:

1. **Given** an employee with a Muqeem Document, **When** exported, **Then** the "رابط ملف وثيقة مقيم" cell is a clickable link that opens the file.
2. **Given** an employee with no Muqeem Document, **When** exported, **Then** the "رابط ملف وثيقة مقيم" cell is empty.
3. **Given** a legacy external URL value, **When** exported, **Then** the cell links directly to that URL (same handling as the other file columns).

### User Story 3 - Import & template stay free of the file-URL column (Priority: P2)

The employee import flow and the downloadable import template do not contain the Muqeem Document URL column; re-importing a previously exported file ignores that URL column without error.

**Why this priority**: Prevents users from accidentally trying to set the file reference via import and keeps the template clean.

**Independent Test**: Download the employee template → no Muqeem Document URL column present. Import a file that *does* contain the column → import succeeds and ignores it (no blocking error, column hidden in preview).

**Acceptance Scenarios**:

1. **Given** the employee import template, **When** downloaded, **Then** it contains no Muqeem Document URL column.
2. **Given** an exported employees file (which contains the Muqeem Document URL column), **When** imported, **Then** the column is ignored and hidden in the preview and does not block validation.

### Edge Cases

- Employee soft-deleted: upload disabled (same as the other document fields).
- Replacement leaves no orphaned storage object (old object removed only after the new reference is saved).
- Signed-URL generation failure during export: export still completes; the affected cell falls back to empty (same warning behavior as the other file columns).
- The Muqeem Document file must never populate `residence_thumbnail_url` or the card avatar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let an authorized user attach a Muqeem Document file to an employee, independently of the Residence File and the 069 document attachments.
- **FR-002**: The Muqeem Document upload field MUST support drag-and-drop and click-to-pick, matching the existing document field behavior, in **both** the EmployeeCard edit view and the AddEmployeeModal.
- **FR-003**: The file MUST be document-only: no crop step, no avatar/thumbnail extraction, and it MUST NOT alter the employee card image.
- **FR-004**: File validation (max 500 KB; allowed types JPEG/PNG/WebP/PDF) and Arabic error messaging MUST match the existing document-file rules.
- **FR-005**: The attachment MUST be viewable and downloadable after saving, consistent with the existing document viewer (image lightbox / PDF viewer / legacy-URL link).
- **FR-006**: Replacing or deleting the attachment MUST remove the previously stored object and update the employee record reference; the reference MUST only be written after a successful upload.
- **FR-007**: Excel employee export MUST add one column — Muqeem Document File URL ("رابط ملف وثيقة مقيم") — using the same signed-link generation and clickable-hyperlink rendering as the existing file-URL columns.
- **FR-008**: The employee import flow MUST NOT accept or require the Muqeem Document URL column, and MUST ignore it (without a blocking error) if present in an uploaded file.
- **FR-009**: The downloadable employee import template MUST NOT contain the Muqeem Document URL column.
- **FR-010**: The new attachment MUST be stored in the existing private `employee-documents` storage area and remain inaccessible without the same employee view/edit permission used for the other document files. No new bucket and no new RLS policy MUST be created.
- **FR-011**: Persistence MUST survive page reload and reflect across all employee views that read the employee record.
- **FR-012**: The display label for the field/document MUST be "وثيقة مقيم"; the upload field label MUST be "ملف وثيقة مقيم". All new UI text MUST be Arabic RTL.

### Key Entities *(include if feature involves data)*

- **Employee**: gains one document-reference attribute — Muqeem Document file reference (`muqeem_document_url`) — alongside the existing residence and 069 document references. It is optional, nullable, and holds a stored-object path (or a legacy external URL). No thumbnail column is added.
- **Employee document object**: a stored private file (image or PDF ≤ 500 KB) belonging to one employee, addressed by a per-employee path under the `muqeem-document/` subfolder; access gated by employee permissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can attach the Muqeem Document to an employee and, after reload, view/download it — in under 1 minute.
- **SC-002**: 100% of exported rows expose the new column; every row that has a stored file yields a working clickable link.
- **SC-003**: 0 occurrences of the Muqeem Document URL column in the import template, and importing an exported file produces 0 column-mismatch blocking errors caused by that column.
- **SC-004**: 0 occurrences of a Muqeem Document upload changing an employee's card avatar.
- **SC-005**: No regression to existing Residence File or 069 (Health Certificate / Ajeer Contract) upload, export, or import behavior.

## Assumptions

- A single new nullable text column `muqeem_document_url` is added to `employees`; no thumbnail column is added.
- The new file reuses the existing private bucket `employee-documents` under a distinct subfolder (`muqeem-document/`); because the bucket RLS is path-agnostic and permission-based, **no new storage RLS policies are required**.
- Validation constants (size/MIME) are shared with the existing document-file rules.
- The new export column is placed adjacent to the existing file-URL columns and uses the same 7-day signed-URL validity.
- Upload fields appear in **both** the EmployeeCard edit view and the AddEmployeeModal, both using drag-and-drop, reusing the 069 `EmployeeDocumentField` / `EmployeeDocViewer` components and `useEmployeeDocFile` hook (extended only by adding a new document type entry — no in-place edits to residence or 069 column logic).
- Legacy external URL values (http/https) are handled identically to the other document files.
- This feature does not add new alerts, dashboard stats, expiry tracking, or permissions for the new file (document only).

## Dependencies & Risks

- **Export column-index coupling**: export hyperlink logic finds link columns by header text and column widths (`!cols`) are positional — adding a column requires updating both arrays.
- **Import preview hide-rule**: the new URL column must be added to the import preview hide rule so re-importing an exported file behaves cleanly.
- **Type/schema fan-out**: `Employee` type (`lib/supabase.ts`), Drizzle schema (`lib/db/src/schema/employees.ts`), and select-column strings in employee fetch/insert/update/export queries must all include the new column or it reads as undefined.
- **069 reuse**: the 069 `EmployeeDocumentField`, `EmployeeDocViewer`, `useEmployeeDocFile`, and `EMPLOYEE_DOC_TYPES` registry are designed generically; this feature should extend the registry with a `muqeem` entry rather than duplicating components. If 069 is not yet merged into this branch base, its modules must exist first.
